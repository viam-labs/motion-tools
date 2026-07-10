import type { Snapshot } from '$lib/buf/draw/v1/snapshot_pb'

import { FileDropperError } from '$lib/components/FileDrop/file-dropper'

import { parsePlan, PlanParseError } from './parse-plan'
import { parsedPlanToSnapshots } from './plan-to-snapshots'

const truncate = (s: string, max = 40): string => (s.length > max ? `${s.slice(0, max - 1)}…` : s)

type PlanDropResult =
	| { success: true; name: string; content: string; snapshots: Snapshot[]; stepCount: number }
	| { success: false; error: FileDropperError }

export const planDropper = async ({
	name,
	content,
}: {
	name: string
	content: string | ArrayBuffer | null | undefined
}): Promise<PlanDropResult> => {
	const label = truncate(name)

	if (typeof content !== 'string') {
		return { success: false, error: new FileDropperError(`"${label}" failed to load.`) }
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
