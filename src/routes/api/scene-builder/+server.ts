import { ChatAnthropic } from '@langchain/anthropic'
import { error, json } from '@sveltejs/kit'
import { z } from 'zod'

import type { RequestHandler } from './$types'

const RequestSchema = z.object({
	prompt: z.string().min(1),
	components: z.array(
		z.object({
			name: z.string(),
			frame: z.object({
				parent: z.string(),
				translation: z.object({ x: z.number(), y: z.number(), z: z.number() }),
				orientation: z.object({
					type: z.string(),
					value: z.record(z.string(), z.number()),
				}),
			}),
		})
	),
})

const FrameDeltaSchema = z.object({
	componentName: z.string(),
	translation: z
		.object({
			x: z.number().optional(),
			y: z.number().optional(),
			z: z.number().optional(),
		})
		.optional(),
	// Full orientation replacement as ov_degrees { x, y, z, th }
	orientation: z
		.object({
			x: z.number(),
			y: z.number(),
			z: z.number(),
			th: z.number(),
		})
		.optional(),
	parent: z.string().optional(),
	explanation: z.string().optional(),
})

const ResponseSchema = z.object({
	updates: z.array(FrameDeltaSchema),
	explanation: z.string(),
})

const SYSTEM_PROMPT = `You are a robot spatial configuration assistant. The user wants to adjust frame positions and orientations of robot components. Return only the components that need to change and only the fields being changed (delta — do not repeat unchanged fields).

Rules:
- Only modify components listed in the context below. Each component has a "name" field — use that exact string as "componentName" in your response.
- Return only components that actually need to change.
- For translation, return only the changed axes (x, y, z are each optional).
- For orientation, return the full { x, y, z, th } orientation vector: (x,y,z) is the unit axis, th is the rotation angle in degrees.
- For parent, return the new parent frame name as a string.
- All translation values are in millimeters.
- Do not change geometry or attributes.
- For complex commands — those affecting more than one component, or more than two fields on a single component (e.g. moving an arm 200mm and re-parenting its gripper) — include a short "explanation" phrase on each delta describing what that specific change does (e.g. "move 200mm forward along X", "re-parent to updated arm"). Keep each explanation to one short phrase. Omit "explanation" for simple single-field changes.`

export const POST: RequestHandler = async ({ request }) => {
	const apiKey = process.env.ANTHROPIC_API_KEY
	if (!apiKey) {
		error(500, 'ANTHROPIC_API_KEY not configured')
	}

	let body: unknown
	try {
		body = await request.json()
	} catch {
		error(400, 'Invalid JSON body')
	}

	const parsed = RequestSchema.safeParse(body)
	if (!parsed.success) {
		error(400, `Invalid request: ${parsed.error.message}`)
	}

	const { prompt, components } = parsed.data

	const model = new ChatAnthropic({
		model: 'claude-haiku-4-5-20251001',
		apiKey,
	}).withStructuredOutput(ResponseSchema)

	try {
		const result = await model.invoke([
			{
				role: 'system',
				content: `${SYSTEM_PROMPT}\n\nCurrent components:\n${JSON.stringify(components, null, 2)}`,
			},
			{ role: 'user', content: prompt },
		])

		return json(result)
	} catch (error_) {
		console.error('LLM error:', error_)
		error(502, 'LLM call failed')
	}
}
