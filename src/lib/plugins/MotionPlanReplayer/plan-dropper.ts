import { FileDropperError } from '$lib/components/FileDrop/file-dropper'

import type { PlanReplay } from './plan-to-snapshots'

import { parsePlan, PlanParseError } from './parse-plan'
import { parsedPlanToReplay } from './plan-to-snapshots'

const truncate = (s: string, max = 40): string => (s.length > max ? `${s.slice(0, max - 1)}…` : s)

type PlanDropResult =
	| { success: true; name: string; content: string; replay: PlanReplay; stepCount: number }
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
		const replay = parsedPlanToReplay(plan)
		return { success: true, name, content, replay, stepCount: replay.snapshots.length }
	} catch (error) {
		const message = error instanceof PlanParseError ? error.message : `"${label}" failed to parse.`
		return { success: false, error: new FileDropperError(message) }
	}
}
