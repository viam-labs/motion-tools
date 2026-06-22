import { z } from 'zod'

const RawFrameSchema = z.object({
	frame_type: z.string(),
	frame: z.unknown(),
})

const FrameSystemSchema = z.object({
	frames: z.record(z.string(), RawFrameSchema),
	parents: z.record(z.string(), z.string()),
})

const PlanChunkSchema = z.object({
	frame_system: FrameSystemSchema.optional(),
	goals: z.array(z.unknown()).optional(),
	trajectory: z.array(z.record(z.string(), z.array(z.number()))).optional(),
})

export type RawFrame = z.infer<typeof RawFrameSchema>

export type ParsedPlan = {
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

const splitJsonObjects = (content: string): string[] => {
	const chunks: string[] = []
	let index = 0
	for (let i = 0; i < 8; i++) {
		index = skipWhitespace(content, index)
		if (index >= content.length) break
		const next = readJSONObject(content, index)
		if (!next) break
		chunks.push(next.raw)
		index = next.end
	}
	return chunks
}

const parseChunk = (raw: string): z.infer<typeof PlanChunkSchema> => {
	let parsed: unknown
	try {
		parsed = JSON.parse(raw)
	} catch {
		throw new PlanParseError('plan JSON contains invalid JSON')
	}

	const result = PlanChunkSchema.safeParse(parsed)
	if (!result.success) {
		throw new PlanParseError('plan JSON does not match expected motion plan format')
	}
	return result.data
}

export const parsePlan = (content: string): ParsedPlan => {
	const chunks = splitJsonObjects(content)
	if (chunks.length === 0) {
		throw new PlanParseError('plan JSON contains invalid JSON')
	}

	let frames: Record<string, RawFrame> = {}
	let parents: Record<string, string> = {}
	let trajectory: Array<Record<string, number[]>> = []
	let goals: unknown[] = []
	let foundFrameSystem = false

	for (const chunk of chunks) {
		const obj = parseChunk(chunk)

		if (obj.frame_system) {
			frames = obj.frame_system.frames
			parents = obj.frame_system.parents
			goals = obj.goals ?? []
			foundFrameSystem = true
		}

		if (obj.trajectory) {
			trajectory = obj.trajectory
		}
	}

	if (!foundFrameSystem) throw new PlanParseError('plan is missing frame_system')

	return { frames, parents, trajectory, goals }
}
