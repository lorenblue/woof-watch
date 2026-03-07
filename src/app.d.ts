// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
declare global {
	namespace App {
		// interface Error {}
		// interface Locals {}
		// interface PageData {}
		// interface PageState {}
		// interface Platform {}
	}

	interface Navigator {
		standalone?: boolean;
	}

	interface Window {
		__woofStartupLog?: {
			version: number;
			startedAtEpoch: number;
			startedAtIso: string;
			startedAtPerf: number;
			seq: number;
			entries: Array<{
				id: number;
				atIso: string;
				sinceStartMs: number;
				level: 'info' | 'warn' | 'error';
				source: string;
				message: string;
				details?: unknown;
			}>;
			push: (entry: {
				level: 'info' | 'warn' | 'error';
				source: string;
				message: string;
				details?: unknown;
			}) => unknown;
			snapshot: () => Array<{
				id: number;
				atIso: string;
				sinceStartMs: number;
				level: 'info' | 'warn' | 'error';
				source: string;
				message: string;
				details?: unknown;
			}>;
			clear: () => void;
			subscribe: (
				listener: (
					entries: Array<{
						id: number;
						atIso: string;
						sinceStartMs: number;
						level: 'info' | 'warn' | 'error';
						source: string;
						message: string;
						details?: unknown;
					}>,
					meta: { startedAtIso: string | null; entryCount: number }
				) => void
			) => () => void;
		};
	}
}

export {};
