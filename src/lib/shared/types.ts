export const ACTION_TYPES = ['pee', 'poo', 'eat'] as const;
export type ActionType = (typeof ACTION_TYPES)[number];

export function isActionType(x: unknown): x is ActionType {
	return typeof x === 'string' && (ACTION_TYPES as readonly string[]).includes(x);
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
};

export type CreateEventResponse =
	| {
			ok: true;
			eventId: string;
	  }
	| {
			ok: false;
			error: string;
	  };
