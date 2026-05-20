import { error } from '@sveltejs/kit';
import { prisma } from '$lib/server/prisma';
import type {
	ActionType,
	ActorStatsResponse,
	StatsActionFilter,
	StatsPeriod
} from '$lib/shared/types';
import { Prisma } from '../../../prisma/generated/client';

const PERIOD_ALIASES: Record<string, StatsPeriod> = {
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

type TotalEventsRow = {
	totalEvents: number;
};

type ActorSummaryRow = {
	actorId: string;
	name: string;
	total: number;
	pee: number;
	poo: number;
	eat: number;
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

function periodFilter(period: StatsPeriod) {
	switch (period) {
		case '7d':
			return Prisma.sql`AND e."occurredAt" >= now() - interval '7 days'`;
		case '30d':
			return Prisma.sql`AND e."occurredAt" >= now() - interval '30 days'`;
		case 'all':
			return Prisma.empty;
	}
}

function actionTypeFilter(actionType: StatsActionFilter) {
	if (actionType === 'all') return Prisma.empty;

	return Prisma.sql`AND e."actionTypeId" = ${actionType satisfies ActionType}`;
}

export async function getActorStats(
	period: StatsPeriod,
	actionType: StatsActionFilter
): Promise<ActorStatsResponse> {
	const periodSql = periodFilter(period);
	const actionTypeSql = actionTypeFilter(actionType);

	const [totalEventsRows, actorRows] = await Promise.all([
		prisma.$queryRaw<TotalEventsRow[]>`
			SELECT COUNT(*)::int AS "totalEvents"
			FROM dog_event e
			WHERE e."undoneAt" IS NULL
			${periodSql}
			${actionTypeSql}
		`,
		prisma.$queryRaw<ActorSummaryRow[]>`
			SELECT
				a."id" AS "actorId",
				a."name" AS "name",
				COUNT(e."id")::int AS "total",
				COUNT(*) FILTER (WHERE e."actionTypeId" = 'pee')::int AS "pee",
				COUNT(*) FILTER (WHERE e."actionTypeId" = 'poo')::int AS "poo",
				COUNT(*) FILTER (WHERE e."actionTypeId" = 'eat')::int AS "eat"
			FROM actor a
			LEFT JOIN dog_event e
				ON e."actorId" = a."id"
				AND e."undoneAt" IS NULL
				${periodSql}
				${actionTypeSql}
			GROUP BY a."id", a."name"
			ORDER BY "total" DESC, a."name" ASC
		`
	]);

	const totalEvents = totalEventsRows[0]?.totalEvents ?? 0;

	return {
		period,
		actionType,
		totalEvents,
		actors: actorRows.map((row) => ({
			...row,
			shareOfTotal: totalEvents === 0 ? 0 : row.total / totalEvents
		}))
	};
}
