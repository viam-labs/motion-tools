import { type FileDropper, FileDropperError } from '$lib/components/FileDrop/file-dropper'

import { PlanParseError } from './parse-plan'
import { planJsonToSnapshots } from './plan-to-snapshots'

const truncate = (s: string, max = 40): string => (s.length > max ? `${s.slice(0, max - 1)}…` : s)

// Adapted detection from POC: bov-debug-bad-plans:src/lib/loaders/plan-request-loader.ts
export const planDropper: FileDropper = async ({ name, content }) => {
	const label = truncate(name)

	if (typeof content !== 'string') {
		return { success: false, error: new FileDropperError(`"${label}" failed to load.`) }
	}

	if (!content.includes('"frame_system"')) {
		return {
			success: false,
			error: new FileDropperError(`"${label}" is not a valid motion plan JSON.`),
		}
	}

	try {
		const snapshots = planJsonToSnapshots(content)
		return { success: true, name, type: 'plan', content, snapshots, stepCount: snapshots.length }
	} catch (error) {
		const message = error instanceof PlanParseError ? error.message : `"${label}" failed to parse.`
		return { success: false, error: new FileDropperError(message) }
	}
}
