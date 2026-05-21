import type { FileDropper } from './file-dropper'

import { FileDropperError } from './file-dropper'

interface planRequestResponse {
	component_names: string[]
	goal_count: number
}

const skipWhitespace = (text: string, start: number): number => {
	let i = start
	while (i < text.length && /\s/.test(text[i]!)) i++
	return i
}

const readJSONObject = (text: string, start: number): { raw: string; end: number } | null => {
	let i = skipWhitespace(text, start)
	if (i >= text.length || text[i] !== '{') return null

	let depth = 0
	let inString = false
	let escaped = false
	for (; i < text.length; i++) {
		const ch = text[i]!

		if (inString) {
			if (escaped) {
				escaped = false
				continue
			}
			if (ch === '\\') {
				escaped = true
				continue
			}
			if (ch === '"') inString = false
			continue
		}

		if (ch === '"') {
			inString = true
			continue
		}
		if (ch === '{') {
			depth++
			continue
		}
		if (ch === '}') {
			depth--
			if (depth === 0) {
				return { raw: text.slice(start, i + 1), end: i + 1 }
			}
		}
	}

	return null
}

const extractPlanRequestJSON = (content: string): { body: string } | { error: string } => {
	try {
		const parsed = JSON.parse(content)
		if (parsed && typeof parsed === 'object' && 'frame_system' in parsed) {
			return { body: JSON.stringify(parsed) }
		}
	} catch {
		// Fall through to multi-object parsing.
	}

	let index = 0
	for (let i = 0; i < 6; i++) {
		index = skipWhitespace(content, index)
		const next = readJSONObject(content, index)
		if (!next) break

		try {
			const parsed = JSON.parse(next.raw)
			if (parsed && typeof parsed === 'object' && 'frame_system' in parsed) {
				return { body: JSON.stringify(parsed) }
			}
		} catch {
			return { error: 'is not valid JSON.' }
		}

		index = next.end
	}

	return { error: 'is not a supported file type.' }
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

		const extracted = extractPlanRequestJSON(content)
		if ('error' in extracted) {
			return { success: false, error: new FileDropperError(`${name} ${extracted.error}`) }
		}

		let resp: Response
		try {
			resp = await fetch(`${drawServerUrl}/plan-request`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: extracted.body,
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
