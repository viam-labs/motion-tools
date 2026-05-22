interface PlanRequestLoadSuccess {
	success: true
	name: string
	type: 'plan-request'
	componentNames: string[]
	goalCount: number
	totalSteps: number
	currentStep: number
}

export class PlanRequestLoadError extends Error {
	constructor(message: string, options?: ErrorOptions) {
		super(message, options)
		this.name = 'PlanRequestLoadError'
	}
}

interface PlanRequestLoadFailure {
	success: false
	error: PlanRequestLoadError
}

export type PlanRequestLoadResult = PlanRequestLoadSuccess | PlanRequestLoadFailure

export type PlanRequestLoadParams = {
	name: string
	content: string
}

export type PlanRequestLoader = (params: PlanRequestLoadParams) => Promise<PlanRequestLoadResult>

interface PlanRequestResponse {
	component_names: string[]
	goal_count: number
	total_steps: number
	current_step: number
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

const extractPlanRequestJSON = (content: string): { ok: true } | { error: string } => {
	try {
		const parsed = JSON.parse(content)
		if (parsed && typeof parsed === 'object' && 'frame_system' in parsed) {
			return { ok: true }
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
				return { ok: true }
			}
		} catch {
			return { error: 'is not valid JSON.' }
		}

		index = next.end
	}

	return { error: 'is not a supported file type.' }
}

// Creates a loader that POSTs plan-request JSON to the draw server.
export const createPlanRequestLoader = (drawServerUrl: string, prefix = ''): PlanRequestLoader => {
	return async ({ name, content }) => {
		const extracted = extractPlanRequestJSON(content)
		if ('error' in extracted) {
			return { success: false, error: new PlanRequestLoadError(`${name} ${extracted.error}`) }
		}

		const url = prefix
			? `${drawServerUrl}/plan-request?prefix=${encodeURIComponent(prefix)}`
			: `${drawServerUrl}/plan-request`

		let resp: Response
		try {
			resp = await fetch(url, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: content,
			})
		} catch {
			return {
				success: false,
				error: new PlanRequestLoadError(`${name}: could not reach draw server.`),
			}
		}

		if (!resp.ok) {
			const text = await resp.text()
			return {
				success: false,
				error: new PlanRequestLoadError(`${name}: ${text.trim()}`),
			}
		}

		const result = (await resp.json()) as PlanRequestResponse
		return {
			success: true,
			name,
			type: 'plan-request',
			componentNames: result.component_names ?? [],
			goalCount: result.goal_count ?? 0,
			totalSteps: result.total_steps ?? 0,
			currentStep: result.current_step ?? -1,
		}
	}
}
