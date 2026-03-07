import { browser } from '$app/environment';

export type StartupLogLevel = 'info' | 'warn' | 'error';

export type StartupLogEntry = {
	id: number;
	atIso: string;
	sinceStartMs: number;
	level: StartupLogLevel;
	source: string;
	message: string;
	details?: unknown;
};

export type StartupLogMeta = {
	startedAtIso: string | null;
	entryCount: number;
};

type StartupLogListener = (entries: StartupLogEntry[], meta: StartupLogMeta) => void;

type StartupLogRuntime = {
	version: number;
	startedAtEpoch: number;
	startedAtIso: string;
	startedAtPerf: number;
	seq: number;
	entries: StartupLogEntry[];
	push: (entry: Omit<StartupLogEntry, 'id' | 'atIso' | 'sinceStartMs'>) => StartupLogEntry;
	snapshot: () => StartupLogEntry[];
	clear: () => void;
	subscribe: (listener: StartupLogListener) => () => void;
};

const MAX_ENTRIES = 1000;

function roundMs(value: number) {
	return Math.round(value * 10) / 10;
}

function consoleArgs(entry: StartupLogEntry) {
	const prefix = `[startup][${entry.source}] +${entry.sinceStartMs}ms ${entry.message}`;
	return entry.details === undefined ? [prefix] : [prefix, entry.details];
}

function notify(runtime: StartupLogRuntime, listeners: Set<StartupLogListener>) {
	const entries = runtime.snapshot();
	const meta = getStartupLogMeta();

	for (const listener of listeners) {
		listener(entries, meta);
	}
}

function createRuntime(): StartupLogRuntime {
	const listeners = new Set<StartupLogListener>();

	const runtime: StartupLogRuntime = {
		version: 1,
		startedAtEpoch: Date.now(),
		startedAtIso: new Date().toISOString(),
		startedAtPerf: typeof performance !== 'undefined' ? performance.now() : 0,
		seq: 0,
		entries: [],
		push(entry) {
			const nowPerf = typeof performance !== 'undefined' ? performance.now() : 0;
			const nextEntry: StartupLogEntry = {
				id: ++runtime.seq,
				atIso: new Date().toISOString(),
				sinceStartMs: roundMs(nowPerf - runtime.startedAtPerf),
				...entry
			};

			runtime.entries = [...runtime.entries, nextEntry].slice(-MAX_ENTRIES);
			notify(runtime, listeners);

			if (entry.level === 'error') {
				console.error(...consoleArgs(nextEntry));
			} else if (entry.level === 'warn') {
				console.warn(...consoleArgs(nextEntry));
			} else {
				console.log(...consoleArgs(nextEntry));
			}

			return nextEntry;
		},
		snapshot() {
			return runtime.entries.slice();
		},
		clear() {
			runtime.entries = [];
			notify(runtime, listeners);
		},
		subscribe(listener) {
			listeners.add(listener);
			listener(runtime.snapshot(), getStartupLogMeta());
			return () => listeners.delete(listener);
		}
	};

	return runtime;
}

function getRuntime() {
	if (!browser) {
		return null;
	}

	window.__woofStartupLog ??= createRuntime();
	return window.__woofStartupLog;
}

function serializeError(error: unknown) {
	if (error instanceof Error) {
		return {
			name: error.name,
			message: error.message,
			stack: error.stack
		};
	}

	return error;
}

export function startupLog(
	source: string,
	message: string,
	details?: unknown,
	level: StartupLogLevel = 'info'
) {
	getRuntime()?.push({ source, message, details, level });
}

export function startupWarn(source: string, message: string, details?: unknown) {
	startupLog(source, message, details, 'warn');
}

export function startupError(
	source: string,
	message: string,
	error: unknown,
	details?: Record<string, unknown>
) {
	startupLog(
		source,
		message,
		{
			...details,
			error: serializeError(error)
		},
		'error'
	);
}

export function measureStartup(source: string, message: string, details?: Record<string, unknown>) {
	const startedAt = browser && typeof performance !== 'undefined' ? performance.now() : 0;
	startupLog(source, `${message}:start`, details);

	return {
		end(endDetails?: Record<string, unknown>, endMessage = `${message}:end`) {
			startupLog(source, endMessage, {
				...details,
				...endDetails,
				durationMs: roundMs(
					(typeof performance !== 'undefined' ? performance.now() : 0) - startedAt
				)
			});
		},
		fail(error: unknown, endDetails?: Record<string, unknown>, endMessage = `${message}:error`) {
			startupError(source, endMessage, error, {
				...details,
				...endDetails,
				durationMs: roundMs(
					(typeof performance !== 'undefined' ? performance.now() : 0) - startedAt
				)
			});
		}
	};
}

export function getStartupLogEntries() {
	return getRuntime()?.snapshot() ?? [];
}

export function getStartupLogMeta(): StartupLogMeta {
	const runtime = browser ? window.__woofStartupLog : null;

	return {
		startedAtIso: runtime?.startedAtIso ?? null,
		entryCount: runtime?.entries.length ?? 0
	};
}

export function subscribeToStartupLog(listener: StartupLogListener) {
	return getRuntime()?.subscribe(listener) ?? (() => {});
}

export function clearStartupLog() {
	getRuntime()?.clear();
}

export function formatStartupLogDetails(details: unknown) {
	if (details === undefined) {
		return '';
	}

	if (typeof details === 'string') {
		return details;
	}

	try {
		return JSON.stringify(details, null, 2);
	} catch {
		return String(details);
	}
}

export function formatStartupLogDump(
	entries: StartupLogEntry[] = getStartupLogEntries(),
	meta: StartupLogMeta = getStartupLogMeta()
) {
	const lines = [
		`startup log`,
		`startedAt=${meta.startedAtIso ?? 'unknown'}`,
		`entryCount=${entries.length}`,
		''
	];

	for (const entry of entries) {
		lines.push(
			`${entry.atIso} +${entry.sinceStartMs}ms [${entry.level}] [${entry.source}] ${entry.message}`
		);

		const details = formatStartupLogDetails(entry.details);
		if (details) {
			lines.push(details);
		}

		lines.push('');
	}

	return lines.join('\n');
}
