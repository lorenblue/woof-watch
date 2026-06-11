import { prisma } from '$lib/server/prisma';
import { isActionType, type ActionType } from '$lib/shared/types';

type ReminderScoreRow = {
	dogId: string;
	dogName: string;
	actionType: string;
	latestEventId: string;
	latestAt: Date | string;
	elapsedMinutes: number;
	usualAgeMinutes: number;
	sampleCount: number;
	rawSampleCount: number;
	ignoredSampleCount: number;
};

export type ReminderCandidateOptions = {
	now: Date;
	timezone: string;
	percentile: number;
	minSamples: number;
};

export type ReminderScore = {
	dogId: string;
	dogName: string;
	actionType: ActionType;
	latestEventId: string;
	latestAt: string;
	elapsedMinutes: number;
	usualAgeMinutes: number;
	sampleCount: number;
	rawSampleCount: number;
	ignoredSampleCount: number;
	hasEnoughSamples: boolean;
	isOverdue: boolean;
	overByMinutes: number;
	ratio: number;
};

export async function getReminderScores({
	now,
	timezone,
	percentile,
	minSamples
}: ReminderCandidateOptions): Promise<ReminderScore[]> {
	const rows = await prisma.$queryRaw<ReminderScoreRow[]>`
		WITH requested_check_time AS (
			-- One row: the "as of" instant in stored UTC form and local wall-clock form.
			-- The database stores DateTime values as UTC-ish timestamp without time zone,
			-- so local time needs an explicit UTC -> requested timezone conversion.
			SELECT
				${now}::timestamp AS "nowAt",
				${now}::timestamp AT TIME ZONE 'UTC' AT TIME ZONE ${timezone} AS "nowLocal"
		),
		current_latest_events AS (
			-- One row per dog/action with a log before now.
			-- "elapsedMinutes" is what the reminder model is judging right now:
			-- at the requested check time, how old is the latest event?
			SELECT DISTINCT ON (e."dogId", e."actionTypeId")
				e."dogId" AS "dogId",
				d."name" AS "dogName",
				e."actionTypeId" AS "actionType",
				e."id" AS "latestEventId",
				e."occurredAt" AS "latestAt",
				(EXTRACT(epoch FROM (s."nowAt" - e."occurredAt")) / 60.0)::double precision
					AS "elapsedMinutes"
			FROM dog_event e
			CROSS JOIN requested_check_time s
			JOIN dog d ON d."id" = e."dogId"
			WHERE e."occurredAt" <= s."nowAt"
			ORDER BY e."dogId", e."actionTypeId", e."occurredAt" DESC
		),
		prior_local_days AS (
			-- One row per prior local calendar day in the dataset.
			-- The current local day is excluded so an unresolved event today does not
			-- teach the model that today's missing event is normal.
			SELECT generated."localDate"::date AS "localDate"
			FROM requested_check_time s
			CROSS JOIN LATERAL generate_series(
				(
					SELECT MIN(e."occurredAt" AT TIME ZONE 'UTC' AT TIME ZONE ${timezone})::date
					FROM dog_event e
					WHERE e."occurredAt" < s."nowAt"
				),
				(s."nowLocal"::date - INTERVAL '1 day')::date,
				INTERVAL '1 day'
			) AS generated("localDate")
		),
		prior_day_check_times AS (
			-- One row per prior local day at the same local time-of-day as now.
			-- Example: if nowLocal is Apr 13 08:08, this creates Mar 14 08:08,
			-- Mar 15 08:08, and so on, converted back to stored UTC form.
			SELECT
				(
					(
						hd."localDate"::timestamp
						+ s."nowLocal"::time
					) AT TIME ZONE ${timezone} AT TIME ZONE 'UTC'
				) AS "observedAt"
			FROM prior_local_days hd
			CROSS JOIN requested_check_time s
		),
		prior_day_ages_at_check_time AS (
			-- One row per current dog/action per prior-day check time.
			-- For each prior-day check time, find the latest event before that time,
			-- then calculate how old that event was. These are the historical samples.
			SELECT
				le.*,
				(EXTRACT(epoch FROM (ho."observedAt" - prior_event."occurredAt")) / 60.0)::double precision
					AS "ageMinutes"
			FROM current_latest_events le
			JOIN prior_day_check_times ho ON TRUE
			JOIN LATERAL (
				SELECT e."occurredAt"
				FROM dog_event e
				WHERE e."dogId" = le."dogId"
					AND e."actionTypeId" = le."actionType"
					AND e."occurredAt" <= ho."observedAt"
				ORDER BY e."occurredAt" DESC
				LIMIT 1
			) prior_event ON TRUE
		),
		usual_age_fences AS (
			-- One row per dog/action with the middle-spread stats used for outlier filtering.
			-- High-tail samples are often prior missed events; do not let those define usual.
			-- The high fence is Q3 + 1.5 * IQR, where IQR is Q3 - Q1.
			SELECT
				ha."dogId",
				ha."actionType",
				COUNT(*)::int AS "rawSampleCount",
				percentile_cont(0.25) WITHIN GROUP (ORDER BY ha."ageMinutes") AS "q1AgeMinutes",
				percentile_cont(0.75) WITHIN GROUP (ORDER BY ha."ageMinutes") AS "q3AgeMinutes"
			FROM prior_day_ages_at_check_time ha
			GROUP BY ha."dogId", ha."actionType"
		),
		usual_prior_day_ages AS (
			-- The historical samples that are allowed to teach the model "usual".
			-- Anything above the high fence is still counted in rawSampleCount, but it is
			-- ignored when computing the reminder percentile.
			SELECT
				ha.*,
				ab."rawSampleCount"
			FROM prior_day_ages_at_check_time ha
			JOIN usual_age_fences ab
				ON ab."dogId" = ha."dogId"
				AND ab."actionType" = ha."actionType"
			WHERE ha."ageMinutes" <= (
				ab."q3AgeMinutes" + 1.5 * (ab."q3AgeMinutes" - ab."q1AgeMinutes")
			)
		),
		scored_actions AS (
			-- One row per dog/action with the final score.
			-- usualAgeMinutes is the requested percentile of the non-outlier samples.
			-- TypeScript applies minSamples and decides whether elapsedMinutes is overdue.
			SELECT
				uha."dogId",
				uha."dogName",
				uha."actionType",
				uha."latestEventId",
				uha."latestAt",
				uha."elapsedMinutes",
				(percentile_cont(${percentile}) WITHIN GROUP (ORDER BY uha."ageMinutes"))
					::double precision AS "usualAgeMinutes",
				COUNT(*)::int AS "sampleCount",
				MAX(uha."rawSampleCount")::int AS "rawSampleCount",
				(MAX(uha."rawSampleCount") - COUNT(*))::int AS "ignoredSampleCount"
			FROM usual_prior_day_ages uha
			GROUP BY
				uha."dogId",
				uha."dogName",
				uha."actionType",
				uha."latestEventId",
				uha."latestAt",
				uha."elapsedMinutes"
		)
		SELECT
			sc."dogId",
			sc."dogName",
			sc."actionType",
			sc."latestEventId",
			sc."latestAt",
			sc."elapsedMinutes",
			sc."usualAgeMinutes",
			sc."sampleCount",
			sc."rawSampleCount",
			sc."ignoredSampleCount"
		FROM scored_actions sc
		ORDER BY (sc."elapsedMinutes" / NULLIF(sc."usualAgeMinutes", 0)) DESC,
			sc."elapsedMinutes" DESC;
	`;

	return rows.flatMap((row) => {
		if (!isActionType(row.actionType)) {
			return [];
		}

		const elapsedMinutes = Math.round(row.elapsedMinutes);
		const usualAgeMinutes = Math.round(row.usualAgeMinutes);
		const hasEnoughSamples = row.sampleCount >= minSamples;
		const overByMinutes = elapsedMinutes - usualAgeMinutes;
		const ratio = usualAgeMinutes === 0 ? 0 : elapsedMinutes / usualAgeMinutes;

		return [
			{
				dogId: row.dogId,
				dogName: row.dogName,
				actionType: row.actionType,
				latestEventId: row.latestEventId,
				latestAt: new Date(row.latestAt).toISOString(),
				elapsedMinutes,
				usualAgeMinutes,
				sampleCount: row.sampleCount,
				rawSampleCount: row.rawSampleCount,
				ignoredSampleCount: row.ignoredSampleCount,
				hasEnoughSamples,
				isOverdue: hasEnoughSamples && overByMinutes > 0,
				overByMinutes,
				ratio
			}
		];
	});
}

export async function findStatisticallyOverdueActions(
	options: ReminderCandidateOptions
): Promise<ReminderScore[]> {
	const scores = await getReminderScores(options);
	return scores.filter((score) => score.isOverdue);
}
