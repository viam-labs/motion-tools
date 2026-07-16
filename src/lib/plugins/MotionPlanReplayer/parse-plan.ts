import { z } from 'zod'

const RawFrameSchema = z.object({
	frame_type: z.string(),
	frame: z.unknown(),
})

const FrameSystemSchema = z.object({
	frames: z.record(z.string(), RawFrameSchema),
	parents: z.record(z.string(), z.string()),
})

const GoalPoseInFrameSchema = z.object({
	referenceFrame: z.string().optional(),
	pose: z
		.object({
			x: z.number().optional(),
			y: z.number().optional(),
			z: z.number().optional(),
			oX: z.number().optional(),
			oY: z.number().optional(),
			oZ: z.number().optional(),
			theta: z.number().optional(),
		})
		.optional(),
})

const GoalSchema = z.object({
	poses: z.record(z.string(), GoalPoseInFrameSchema).nullable().optional(),
})

const StartStateSchema = z.object({
	configuration: z.record(z.string(), z.array(z.number())).nullable().optional(),
})

const PlanChunkSchema = z.object({
	frame_system: FrameSystemSchema.optional(),
	goals: z.array(GoalSchema).optional(),
	start_state: StartStateSchema.optional(),
	trajectory: z.array(z.record(z.string(), z.array(z.number()))).optional(),
})

export type RawFrame = z.infer<typeof RawFrameSchema>
export type PlanGoal = z.infer<typeof GoalSchema>

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

const PlanSchema = z
	.string()
	// A plan file is one or more JSON objects concatenated with no separator, so
	// split it before anything can be handed to JSON.parse.
	.transform(splitJsonObjects)
	.pipe(z.array(z.string()).min(1, 'plan JSON contains invalid JSON'))
	.transform((chunks, ctx) => {
		try {
			return chunks.map((raw) => JSON.parse(raw) as unknown)
		} catch {
			ctx.addIssue({ code: 'custom', message: 'plan JSON contains invalid JSON' })
			return z.NEVER
		}
	})
	.pipe(z.array(PlanChunkSchema))
	.transform((chunks, ctx) => {
		let frames: Record<string, RawFrame> = {}
		let parents: Record<string, string> = {}
		let trajectory: Array<Record<string, number[]>> = []
		let goals: PlanGoal[] = []
		let startConfiguration: Record<string, number[]> | null = null
		let foundFrameSystem = false

		for (const chunk of chunks) {
			if (chunk.frame_system) {
				frames = chunk.frame_system.frames
				parents = chunk.frame_system.parents
				goals = chunk.goals ?? []
				foundFrameSystem = true
			}

			if (chunk.start_state?.configuration) {
				startConfiguration = chunk.start_state.configuration
			}

			if (chunk.trajectory) {
				trajectory = chunk.trajectory
			}
		}

		if (!foundFrameSystem) {
			ctx.addIssue({ code: 'custom', message: 'plan is missing frame_system' })
			return z.NEVER
		}

		return { frames, parents, trajectory, goals, startConfiguration }
	})

export type ParsedPlan = z.infer<typeof PlanSchema>

export const parsePlan = (content: string): ParsedPlan => {
	const result = PlanSchema.safeParse(content)
	if (result.success) return result.data

	const issue = result.error.issues[0]
	const path = issue?.path.join('.')
	throw new PlanParseError(
		path ? `${issue!.message} (at ${path})` : (issue?.message ?? 'plan JSON is invalid')
	)
}
