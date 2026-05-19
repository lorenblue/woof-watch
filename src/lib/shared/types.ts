export const ACTION_TYPES = ['pee', 'poo', 'eat'] as const;
export type ActionType = (typeof ACTION_TYPES)[number];

export function isActionType(x: unknown): x is ActionType {
	return typeof x === 'string' && (ACTION_TYPES as readonly string[]).includes(x);
}

export const STATS_PERIODS = ['7d', '30d', 'all'] as const;
export type StatsPeriod = (typeof STATS_PERIODS)[number];

export function isStatsPeriod(x: unknown): x is StatsPeriod {
	return typeof x === 'string' && (STATS_PERIODS as readonly string[]).includes(x);
}

export const STATS_ACTION_FILTERS = ['all', ...ACTION_TYPES] as const;
export type StatsActionFilter = (typeof STATS_ACTION_FILTERS)[number];

export function isStatsActionFilter(x: unknown): x is StatsActionFilter {
	return typeof x === 'string' && (STATS_ACTION_FILTERS as readonly string[]).includes(x);
}

export type LastEvt = {
	at: string; // ISO string
	by: string;
	id: string;
} | null;

export type DogStatus = {
	dogId: string;
	name: string;
	lastPee: LastEvt;
	lastPoo: LastEvt;
	lastEat: LastEvt;
};

export type StatusResponse = {
	dogs: DogStatus[];
};

export type CreateEventRequest = {
	dogId: string;
	actionType: ActionType;
	occurredAt?: string;
};

export type CreateEventResponse =
	| {
			ok: true;
			eventId: string;
			occurredAt: string;
			isLatest: boolean;
	  }
	| {
			ok: false;
			error: string;
	  };

export type EventHistoryItem = {
	id: string;
	occurredAt: string;
	actorName: string;
	canUndo: boolean;
};

export type EventHistoryResponse = {
	events: EventHistoryItem[];
};

export type ActorLeaderboardEntry = {
	actorId: string;
	name: string;
	total: number;
	pee: number;
	poo: number;
	eat: number;
	shareOfTotal: number;
};

export type ActorStatsResponse = {
	period: StatsPeriod;
	actionType: StatsActionFilter;
	totalEvents: number;
	actors: ActorLeaderboardEntry[];
};
