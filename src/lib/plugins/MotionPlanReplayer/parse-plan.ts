export interface RawFrame {
	frame_type: string
	frame: unknown
}

export interface ParsedPlan {
	frames: Record<string, RawFrame>
	parents: Record<string, string>
	trajectory: Array<Record<string, number[]>>
	goals: unknown[]
}

export class PlanParseError extends Error {
	constructor(message: string) {
		super(message)
		this.name = 'PlanParseError'
	}
}

const skipWhitespace = (text: string, start: number): number => {
	let i = start
	while (i < text.length && /\s/.test(text[i]!)) i++
	return i
}

// Adapted from POC: bov-debug-bad-plans:src/lib/loaders/plan-request-loader.ts
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
			if (depth === 0) return { raw: text.slice(start, i + 1), end: i + 1 }
		}
	}
	return null
}

export const parsePlan = (content: string): ParsedPlan => {
	let frames: Record<string, RawFrame> = {}
	let parents: Record<string, string> = {}
	let trajectory: Array<Record<string, number[]>> = []
	let goals: unknown[] = []
	let foundFrameSystem = false

	let index = 0
	for (let i = 0; i < 8; i++) {
		index = skipWhitespace(content, index)
		if (index >= content.length) break
		const next = readJSONObject(content, index)
		if (!next) break

		let obj: Record<string, unknown>
		try {
			obj = JSON.parse(next.raw) as Record<string, unknown>
		} catch {
			throw new PlanParseError('plan JSON contains invalid JSON')
		}

		if (obj.frame_system && typeof obj.frame_system === 'object') {
			const fs = obj.frame_system as Record<string, unknown>
			frames = (fs.frames ?? {}) as Record<string, RawFrame>
			parents = (fs.parents ?? {}) as Record<string, string>
			goals = Array.isArray(obj.goals) ? obj.goals : []
			foundFrameSystem = true
		}

		if (Array.isArray(obj.trajectory)) {
			trajectory = obj.trajectory as Array<Record<string, number[]>>
		}

		index = next.end
	}

	if (!foundFrameSystem) throw new PlanParseError('plan is missing frame_system')

	const frameNames = Object.keys(frames)
	const frameTypes: Record<string, number> = {}
	for (const k of frameNames) {
		const t = frames[k]!.frame_type
		frameTypes[t] = (frameTypes[t] ?? 0) + 1
	}
	console.debug(
		'[parsePlan] frames:', frameNames.length, frameTypes,
		'| parents:', Object.keys(parents).length,
		'| trajectory steps:', trajectory.length,
		'| trajectory component keys:', trajectory[0] ? Object.keys(trajectory[0]) : []
	)
	console.debug(
		'[parsePlan] parents map (first 15):',
		Object.fromEntries(Object.entries(parents).slice(0, 15))
	)

	return { frames, parents, trajectory, goals }
}
