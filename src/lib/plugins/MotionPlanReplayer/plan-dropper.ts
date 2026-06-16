import { type FileDropper, FileDropperError } from '$lib/components/FileDrop/file-dropper'

import { PlanParseError } from './parse-plan'
import { planJsonToSnapshots } from './plan-to-snapshots'

// Adapted detection from POC: bov-debug-bad-plans:src/lib/loaders/plan-request-loader.ts
export const planDropper: FileDropper = async ({ name, content }) => {
	if (typeof content !== 'string') {
		return { success: false, error: new FileDropperError(`${name} failed to load.`) }
	}

	if (!content.includes('"frame_system"')) {
		return { success: false, error: new FileDropperError(`${name} is not a supported file type.`) }
	}

	try {
		const snapshots = planJsonToSnapshots(content)
		return { success: true, name, type: 'plan', content, snapshots, stepCount: snapshots.length }
	} catch (error) {
		const message = error instanceof PlanParseError ? error.message : `${name} failed to parse.`
		return { success: false, error: new FileDropperError(message) }
	}
}
