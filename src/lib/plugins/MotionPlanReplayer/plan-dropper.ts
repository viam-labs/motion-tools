import type { Snapshot } from '$lib/buf/draw/v1/snapshot_pb'

import { FileDropperError } from '$lib/components/FileDrop/file-dropper'

import { parsePlan, PlanParseError } from './parse-plan'
import { parsedPlanToSnapshots } from './plan-to-snapshots'

const truncate = (s: string, max = 40): string => (s.length > max ? `${s.slice(0, max - 1)}…` : s)

/**
 * Turns an uploaded plan into snapshots. Returning `undefined` (or throwing) means "I couldn't —
 * fall back to the client parse". Standalone leaves it unset; the app supplies one that runs the
 * server FK route and returns `undefined` on any failure.
 */
export type ResolvePlanSnapshots = (
	name: string,
	content: string
) => Promise<Snapshot[] | undefined>

type PlanDropResult =
	| { success: true; name: string; content: string; snapshots: Snapshot[]; stepCount: number }
	| { success: false; error: FileDropperError }

export const planDropper = async ({
	name,
	content,
	resolvePlanSnapshots,
}: {
	name: string
	content: string | ArrayBuffer | null | undefined
	resolvePlanSnapshots?: ResolvePlanSnapshots
}): Promise<PlanDropResult> => {
	const label = truncate(name)

	if (typeof content !== 'string') {
		return { success: false, error: new FileDropperError(`"${label}" failed to load.`) }
	}

	if (resolvePlanSnapshots) {
		try {
			const snapshots = await resolvePlanSnapshots(name, content)
			if (snapshots) {
				return { success: true, name, content, snapshots, stepCount: snapshots.length }
			}
		} catch (error) {
			console.warn('[motion] resolvePlanSnapshots failed, parsing on client:', error)
		}
	}

	try {
		const plan = parsePlan(content)
		const snapshots = parsedPlanToSnapshots(plan)
		return { success: true, name, content, snapshots, stepCount: snapshots.length }
	} catch (error) {
		const message = error instanceof PlanParseError ? error.message : `"${label}" failed to parse.`
		return { success: false, error: new FileDropperError(message) }
	}
}
