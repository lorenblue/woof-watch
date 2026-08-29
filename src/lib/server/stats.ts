import { error } from '@sveltejs/kit';
import { prisma } from '$lib/server/prisma';
import type {
	ActionType,
	ActorStatsResponse,
	StatsActionFilter,
	StatsPeriod
} from '$lib/shared/types';
import type { Prisma } from '../../../prisma/generated/client';

const PERIOD_ALIASES: Record<string, StatsPeriod> = {
	'1d': '1d',
	'24h': '1d',
	day: '1d',
	today: '1d',
	'7d': '7d',
	week: '7d',
	'30d': '30d',
	month: '30d',
	all: 'all',
	alltime: 'all',
	'all-time': 'all'
};

const ACTION_TYPE_ALIASES: Record<string, StatsActionFilter> = {
	all: 'all',
	pee: 'pee',
	poo: 'poo',
	eat: 'eat'
};

export function parseStatsPeriod(url: URL): StatsPeriod {
	const raw = url.searchParams.get('period')?.trim().toLowerCase();

	if (!raw) return '7d';

	const period = PERIOD_ALIASES[raw];
	if (!period) throw error(400, 'Invalid stats period');

	return period;
}

export function parseStatsActionType(url: URL): StatsActionFilter {
	const raw = url.searchParams.get('actionType')?.trim().toLowerCase();

	if (!raw) return 'all';

	const actionType = ACTION_TYPE_ALIASES[raw];
	if (!actionType) throw error(400, 'Invalid action type');

	return actionType;
}

function periodStart(period: StatsPeriod) {
	const now = Date.now();

	switch (period) {
		case '1d':
			return new Date(now - 24 * 60 * 60 * 1000);
		case '7d':
			return new Date(now - 7 * 24 * 60 * 60 * 1000);
		case '30d':
			return new Date(now - 30 * 24 * 60 * 60 * 1000);
		case 'all':
			return null;
	}
}

function eventWhere(period: StatsPeriod, actionType: StatsActionFilter): Prisma.DogEventWhereInput {
	const where: Prisma.DogEventWhereInput = {};
	const start = periodStart(period);

	if (start) {
		where.occurredAt = {
			gte: start
		};
	}

	if (actionType !== 'all') {
		where.actionTypeId = actionType satisfies ActionType;
	}

	return where;
}

export async function getActorStats(
	period: StatsPeriod,
	actionType: StatsActionFilter
): Promise<ActorStatsResponse> {
	const where = eventWhere(period, actionType);

	const [actors, groupedEvents] = await Promise.all([
		prisma.actor.findMany({
			orderBy: {
				name: 'asc'
			}
		}),
		prisma.dogEvent.groupBy({
			by: ['actorId', 'actionTypeId'],
			where,
			_count: {
				_all: true
			}
		})
	]);

	const totalEvents = groupedEvents.reduce((total, row) => total + row._count._all, 0);
	const countsByActor = new Map<
		string,
		{
			total: number;
			pee: number;
			poo: number;
			eat: number;
		}
	>();

	for (const row of groupedEvents) {
		const counts = countsByActor.get(row.actorId) ?? {
			total: 0,
			pee: 0,
			poo: 0,
			eat: 0
		};
		const count = row._count._all;

		counts.total += count;
		if (row.actionTypeId === 'pee' || row.actionTypeId === 'poo' || row.actionTypeId === 'eat') {
			counts[row.actionTypeId] += count;
		}

		countsByActor.set(row.actorId, counts);
	}

	return {
		period,
		actionType,
		totalEvents,
		actors: actors
			.map((actor) => {
				const counts = countsByActor.get(actor.id) ?? {
					total: 0,
					pee: 0,
					poo: 0,
					eat: 0
				};

				return {
					actorId: actor.id,
					name: actor.name,
					...counts,
					shareOfTotal: totalEvents === 0 ? 0 : counts.total / totalEvents
				};
			})
			.sort((a, b) => b.total - a.total || a.name.localeCompare(b.name))
	};
}
