import type { FileDropper } from './file-dropper'

import { FileDropperError } from './file-dropper'

interface planRequestResponse {
	component_names: string[]
	goal_count: number
}

/**
 * Creates a FileDropper that POSTs a plan-request JSON file to the draw server.
 * Returns an error result if the JSON does not contain a `frame_system` field
 * (i.e. is not a plan request file).
 */
export const createPlanRequestDropper = (drawServerUrl: string): FileDropper => {
	return async ({ name, content }) => {
		if (typeof content !== 'string') {
			return { success: false, error: new FileDropperError(`${name} failed to load.`) }
		}

		// Quick structural check before sending to the server.
		let parsed: unknown
		try {
			parsed = JSON.parse(content)
		} catch {
			return { success: false, error: new FileDropperError(`${name} is not valid JSON.`) }
		}

		if (
			!parsed ||
			typeof parsed !== 'object' ||
			!('frame_system' in parsed)
		) {
			return {
				success: false,
				error: new FileDropperError(
					`${name} is not a supported file type.`
				),
			}
		}

		let resp: Response
		try {
			resp = await fetch(`${drawServerUrl}/plan-request`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: content,
			})
		} catch {
			return {
				success: false,
				error: new FileDropperError(`${name}: could not reach draw server.`),
			}
		}

		if (!resp.ok) {
			const text = await resp.text()
			return {
				success: false,
				error: new FileDropperError(`${name}: ${text.trim()}`),
			}
		}

		const result = (await resp.json()) as planRequestResponse
		return {
			success: true,
			name,
			type: 'plan-request',
			componentNames: result.component_names ?? [],
			goalCount: result.goal_count ?? 0,
		}
	}
}
