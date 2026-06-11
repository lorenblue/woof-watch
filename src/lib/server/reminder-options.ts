import { error } from '@sveltejs/kit';
import type { ReminderCandidateOptions } from '$lib/server/reminders';

const DEFAULT_TIMEZONE = 'America/Vancouver';
const DEFAULT_PERCENTILE = 0.9;
const DEFAULT_MIN_SAMPLES = 8;

export type ReminderFormState = {
	nowLocal: string;
	timezone: string;
	percentile: number;
	minSamples: number;
};

function readIntParam(url: URL, name: string, fallback: number, min: number, max: number) {
	const raw = url.searchParams.get(name)?.trim();
	if (!raw) return fallback;

	const value = Number(raw);
	if (!Number.isInteger(value) || value < min || value > max) {
		throw error(400, `Invalid ${name}`);
	}

	return value;
}

function readFloatParam(url: URL, name: string, fallback: number, min: number, max: number) {
	const raw = url.searchParams.get(name)?.trim();
	if (!raw) return fallback;

	const value = Number(raw);
	if (!Number.isFinite(value) || value < min || value > max) {
		throw error(400, `Invalid ${name}`);
	}

	return value;
}

function readNowParam(url: URL, timezone: string) {
	const localNow = url.searchParams.get('nowLocal')?.trim();
	if (localNow) return localDateTimeToUtcDate(localNow, timezone);

	const raw = url.searchParams.get('now')?.trim();
	if (!raw) return new Date();

	const now = new Date(raw);
	if (Number.isNaN(now.getTime())) {
		throw error(400, 'Invalid now');
	}

	return now;
}

function parseLocalDateTime(value: string) {
	const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(value);
	if (!match) {
		throw error(400, 'Invalid nowLocal');
	}

	const [, year, month, day, hour, minute] = match;
	return {
		year: Number(year),
		month: Number(month),
		day: Number(day),
		hour: Number(hour),
		minute: Number(minute)
	};
}

function getTimeZoneOffsetMs(date: Date, timezone: string) {
	const parts = new Intl.DateTimeFormat('en-US', {
		timeZone: timezone,
		year: 'numeric',
		month: '2-digit',
		day: '2-digit',
		hour: '2-digit',
		minute: '2-digit',
		second: '2-digit',
		hourCycle: 'h23'
	}).formatToParts(date);

	const values = Object.fromEntries(
		parts.filter((part) => part.type !== 'literal').map((part) => [part.type, Number(part.value)])
	);

	return (
		Date.UTC(values.year, values.month - 1, values.day, values.hour, values.minute, values.second) -
		date.getTime()
	);
}

export function localDateTimeToUtcDate(value: string, timezone: string) {
	const parsed = parseLocalDateTime(value);
	const localAsUtc = Date.UTC(
		parsed.year,
		parsed.month - 1,
		parsed.day,
		parsed.hour,
		parsed.minute
	);
	let utcMs = localAsUtc - getTimeZoneOffsetMs(new Date(localAsUtc), timezone);
	utcMs = localAsUtc - getTimeZoneOffsetMs(new Date(utcMs), timezone);

	return new Date(utcMs);
}

export function formatLocalDateTimeInput(date: Date, timezone: string) {
	const parts = new Intl.DateTimeFormat('en-US', {
		timeZone: timezone,
		year: 'numeric',
		month: '2-digit',
		day: '2-digit',
		hour: '2-digit',
		minute: '2-digit',
		hourCycle: 'h23'
	}).formatToParts(date);

	const values = Object.fromEntries(
		parts.filter((part) => part.type !== 'literal').map((part) => [part.type, part.value])
	);

	return `${values.year}-${values.month}-${values.day}T${values.hour}:${values.minute}`;
}

export function parseReminderOptions(url: URL): ReminderCandidateOptions {
	const timezone = url.searchParams.get('timezone')?.trim() || DEFAULT_TIMEZONE;

	return {
		now: readNowParam(url, timezone),
		timezone,
		percentile: readFloatParam(url, 'percentile', DEFAULT_PERCENTILE, 0.5, 0.99),
		minSamples: readIntParam(url, 'minSamples', DEFAULT_MIN_SAMPLES, 1, 100)
	};
}

export function getReminderFormState(options: ReminderCandidateOptions): ReminderFormState {
	return {
		nowLocal: formatLocalDateTimeInput(options.now, options.timezone),
		timezone: options.timezone,
		percentile: options.percentile,
		minSamples: options.minSamples
	};
}
