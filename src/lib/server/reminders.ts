import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { prisma } from '$lib/server/prisma';
import { sendPushNotifications, type PushSendResult } from '$lib/server/push';
import { isActionType, type ActionType } from '$lib/shared/types';

type ReminderRule = {
	key: string;
	actionType: ActionType;
	checkTime?: string;
	lookbackDuration: string;
	activeStart?: string;
	activeEnd?: string;
	title: string;
	body: string;
	enabled?: boolean;
};

type ReminderConfig = {
	dogs: Record<string, ReminderRule[]>;
};

export type ReminderRunResult = {
	timeZone: string;
	nowLocal: string;
	dryRun: boolean;
	checked: number;
	sent: Array<{
		dogName: string;
		actionType: ActionType;
		ruleKey: string;
		localDate: string;
		push: PushSendResult;
	}>;
	skipped: Array<{
		dogName: string;
		actionType: ActionType;
		ruleKey: string;
		reason: string;
	}>;
};

const DEFAULT_TIME_ZONE = 'America/Vancouver';
const DEFAULT_DUE_WINDOW_MINUTES = 30;
const DEFAULT_CONFIG_PATH = path.join(process.cwd(), 'config', 'reminders.json');

function parseClockTime(value: string) {
	const [rawHour, rawMinute] = value.split(':');
	const hour = Number(rawHour);
	const minute = Number(rawMinute);

	if (
		!Number.isInteger(hour) ||
		!Number.isInteger(minute) ||
		hour < 0 ||
		hour > 23 ||
		minute < 0 ||
		minute > 59
	) {
		throw new Error(`Invalid reminder time: ${value}`);
	}

	return hour * 60 + minute;
}

function parseDuration(value: string) {
	const [rawHour, rawMinute] = value.split(':');
	const hour = Number(rawHour);
	const minute = Number(rawMinute);

	if (
		!Number.isInteger(hour) ||
		!Number.isInteger(minute) ||
		hour < 0 ||
		minute < 0 ||
		minute > 59
	) {
		throw new Error(`Invalid reminder duration: ${value}`);
	}

	return hour * 60 + minute;
}

function validateReminderRule(rule: unknown, dogName: string, index: number): ReminderRule {
	if (!rule || typeof rule !== 'object') {
		throw new Error(`Invalid reminder rule for ${dogName} at index ${index}`);
	}

	const raw = rule as Record<string, unknown>;
	const key = raw.key;
	const actionType = raw.actionType;
	const checkTime = raw.checkTime;
	const lookbackDuration = raw.lookbackDuration;
	const activeStart = raw.activeStart;
	const activeEnd = raw.activeEnd;
	const title = raw.title;
	const body = raw.body;
	const enabled = raw.enabled;

	if (typeof key !== 'string' || key.trim() === '') {
		throw new Error(`Reminder rule for ${dogName} at index ${index} is missing key`);
	}
	if (!isActionType(actionType)) {
		throw new Error(`Reminder rule ${dogName}.${key} has invalid actionType`);
	}
	if (checkTime !== undefined && typeof checkTime !== 'string') {
		throw new Error(`Reminder rule ${dogName}.${key} has invalid checkTime`);
	}
	if (typeof lookbackDuration !== 'string') {
		throw new Error(`Reminder rule ${dogName}.${key} is missing lookbackDuration`);
	}
	if (activeStart !== undefined && typeof activeStart !== 'string') {
		throw new Error(`Reminder rule ${dogName}.${key} has invalid activeStart`);
	}
	if (activeEnd !== undefined && typeof activeEnd !== 'string') {
		throw new Error(`Reminder rule ${dogName}.${key} has invalid activeEnd`);
	}
	if ((activeStart && !activeEnd) || (!activeStart && activeEnd)) {
		throw new Error(`Reminder rule ${dogName}.${key} needs both activeStart and activeEnd`);
	}
	if (typeof title !== 'string' || title.trim() === '') {
		throw new Error(`Reminder rule ${dogName}.${key} is missing title`);
	}
	if (typeof body !== 'string' || body.trim() === '') {
		throw new Error(`Reminder rule ${dogName}.${key} is missing body`);
	}
	if (enabled !== undefined && typeof enabled !== 'boolean') {
		throw new Error(`Reminder rule ${dogName}.${key} has invalid enabled value`);
	}

	if (checkTime) parseClockTime(checkTime);
	parseDuration(lookbackDuration);
	if (activeStart) parseClockTime(activeStart);
	if (activeEnd) parseClockTime(activeEnd);

	return {
		key: key.trim(),
		actionType,
		checkTime,
		lookbackDuration,
		activeStart,
		activeEnd,
		title,
		body,
		enabled
	};
}

function validateReminderConfig(raw: unknown): ReminderConfig {
	if (!raw || typeof raw !== 'object') {
		throw new Error('Reminder config must be an object');
	}

	const dogs = (raw as { dogs?: unknown }).dogs;
	if (!dogs || typeof dogs !== 'object' || Array.isArray(dogs)) {
		throw new Error('Reminder config must include a dogs object');
	}

	const config: ReminderConfig = { dogs: {} };
	for (const [dogName, rules] of Object.entries(dogs)) {
		if (!Array.isArray(rules)) {
			throw new Error(`Reminder config for ${dogName} must be an array`);
		}

		config.dogs[dogName] = rules
			.map((rule, index) => validateReminderRule(rule, dogName, index))
			.filter((rule) => rule.enabled !== false);
	}

	return config;
}

async function loadReminderConfig() {
	const configPath = process.env.REMINDER_CONFIG_PATH ?? DEFAULT_CONFIG_PATH;
	const contents = await readFile(configPath, 'utf8');
	return validateReminderConfig(JSON.parse(contents));
}

function getRulesForDog(config: ReminderConfig, dogName: string) {
	return [...(config.dogs['*'] ?? []), ...(config.dogs[dogName] ?? [])];
}

function getLocalParts(date: Date, timeZone: string) {
	const formatter = new Intl.DateTimeFormat('en-CA', {
		timeZone,
		year: 'numeric',
		month: '2-digit',
		day: '2-digit',
		hour: '2-digit',
		minute: '2-digit',
		hour12: false,
		hourCycle: 'h23'
	});

	const parts = Object.fromEntries(
		formatter.formatToParts(date).map((part) => [part.type, part.value])
	);

	const hour = Number(parts.hour);
	const minute = Number(parts.minute);
	const year = Number(parts.year);
	const month = Number(parts.month);
	const day = Number(parts.day);

	return {
		year,
		month,
		day,
		hour,
		minute,
		localDate: `${parts.year}-${parts.month}-${parts.day}`,
		minuteOfDay: hour * 60 + minute
	};
}

function isRuleDue(rule: ReminderRule, nowMinuteOfDay: number, dueWindowMinutes: number) {
	if (!rule.checkTime) return true;

	const checkMinute = parseClockTime(rule.checkTime);
	return nowMinuteOfDay >= checkMinute && nowMinuteOfDay < checkMinute + dueWindowMinutes;
}

function isRuleActive(rule: ReminderRule, nowMinuteOfDay: number) {
	if (!rule.activeStart || !rule.activeEnd) return true;

	const activeStart = parseClockTime(rule.activeStart);
	const activeEnd = parseClockTime(rule.activeEnd);

	if (activeStart === activeEnd) return true;
	if (activeStart < activeEnd) {
		return nowMinuteOfDay >= activeStart && nowMinuteOfDay < activeEnd;
	}

	return nowMinuteOfDay >= activeStart || nowMinuteOfDay < activeEnd;
}

function getLookbackAt(rule: ReminderRule, now: Date) {
	return new Date(now.getTime() - parseDuration(rule.lookbackDuration) * 60 * 1000);
}

function isUniqueConflict(err: unknown) {
	return (
		typeof err === 'object' &&
		err !== null &&
		'code' in err &&
		(err as { code?: unknown }).code === 'P2002'
	);
}

function getDeliveryRuleKey(rule: ReminderRule, latestEventId?: string) {
	if (rule.checkTime) return rule.key;
	return `${rule.key}:${latestEventId ?? 'none'}`;
}

export async function runReminderChecks(options?: {
	now?: Date;
	timeZone?: string;
	dueWindowMinutes?: number;
	dryRun?: boolean;
}) {
	const timeZone = options?.timeZone ?? process.env.REMINDER_TIME_ZONE ?? DEFAULT_TIME_ZONE;
	const dueWindowMinutes =
		options?.dueWindowMinutes ??
		Number(process.env.REMINDER_DUE_WINDOW_MINUTES ?? DEFAULT_DUE_WINDOW_MINUTES);
	const dryRun = options?.dryRun ?? false;
	const now = options?.now ?? new Date();
	const localNow = getLocalParts(now, timeZone);
	const reminderConfig = await loadReminderConfig();
	const dogs = await prisma.dog.findMany({ orderBy: { name: 'asc' } });
	const result: ReminderRunResult = {
		timeZone,
		nowLocal: `${localNow.localDate} ${String(localNow.hour).padStart(2, '0')}:${String(
			localNow.minute
		).padStart(2, '0')}`,
		dryRun,
		checked: 0,
		sent: [],
		skipped: []
	};

	for (const dog of dogs) {
		const rules = getRulesForDog(reminderConfig, dog.name);

		for (const rule of rules) {
			result.checked += 1;

			if (!isRuleDue(rule, localNow.minuteOfDay, dueWindowMinutes)) {
				continue;
			}

			if (!isRuleActive(rule, localNow.minuteOfDay)) {
				continue;
			}

			const lookbackAt = getLookbackAt(rule, now);
			const existingEvent = await prisma.dogEvent.findFirst({
				where: {
					dogId: dog.id,
					actionTypeId: rule.actionType,
					occurredAt: {
						gte: lookbackAt,
						lte: now
					}
				},
				select: { id: true }
			});

			if (existingEvent) {
				result.skipped.push({
					dogName: dog.name,
					actionType: rule.actionType,
					ruleKey: rule.key,
					reason: 'recent_event'
				});
				continue;
			}

			const latestEvent = rule.checkTime
				? null
				: await prisma.dogEvent.findFirst({
						where: {
							dogId: dog.id,
							actionTypeId: rule.actionType
						},
						orderBy: {
							occurredAt: 'desc'
						},
						select: { id: true }
					});
			const deliveryRuleKey = getDeliveryRuleKey(rule, latestEvent?.id);
			let push: PushSendResult = { sent: 0, failed: 0, deactivated: 0 };

			if (!dryRun) {
				try {
					await prisma.reminderDelivery.create({
						data: {
							dogId: dog.id,
							actionTypeId: rule.actionType,
							ruleKey: deliveryRuleKey,
							localDate: localNow.localDate
						}
					});
				} catch (err) {
					if (isUniqueConflict(err)) {
						result.skipped.push({
							dogName: dog.name,
							actionType: rule.actionType,
							ruleKey: rule.key,
							reason: 'already_sent'
						});
						continue;
					}
					throw err;
				}

				push = await sendPushNotifications(
					{},
					{
						title: `${dog.name}: ${rule.title}`,
						body: rule.body,
						url: '/',
						tag: `reminder-${dog.id}-${deliveryRuleKey}-${localNow.localDate}`,
						data: {
							dogId: dog.id,
							actionType: rule.actionType,
							ruleKey: rule.key,
							deliveryRuleKey,
							localDate: localNow.localDate
						}
					}
				);
			}

			result.sent.push({
				dogName: dog.name,
				actionType: rule.actionType,
				ruleKey: rule.key,
				localDate: localNow.localDate,
				push
			});
		}
	}

	return result;
}
