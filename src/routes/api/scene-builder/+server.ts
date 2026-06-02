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
	componentName: z
		.string()
		.describe('the exact component name from the provided context that needs updating'),
	translation: z
		.object({
			x: z.number().optional(),
			y: z.number().optional(),
			z: z.number().optional(),
		})
		.optional(),
	orientation: z
		.object({
			roll: z.number().optional(),
			pitch: z.number().optional(),
			yaw: z.number().optional(),
		})
		.optional(),
	parent: z.string().optional(),
	explanation: z
		.string()
		.optional()
		.describe(
			'brief phrase explaining what this specific change does — omit for simple single-field changes'
		),
})

const ResponseSchema = z.object({
	updates: z.array(FrameDeltaSchema),
	explanation: z.string(),
})

const SYSTEM_PROMPT = `You are a robot spatial configuration assistant. The user wants to adjust frame positions and orientations of robot components. Return only the components that need to change and only the fields being changed (delta — do not repeat unchanged fields).

Rules:
- Only modify components listed in the context below. Each component has a "name" field — use that exact string as "componentName" in your response.
- Return only components that actually need to change.
- For translation, return only the changed axes (x, y, z are each optional). All translation values are in millimeters.
- For orientation, return only the euler angle fields that are changing (roll, pitch, yaw are each optional, in degrees).
  - Coordinate system: X is forward, Y is left, Z is up (right-handed).
  - yaw: rotation around Z — positive turns left, negative turns right.
  - pitch: rotation around Y — positive tilts nose up, negative tilts nose down.
  - roll: rotation around X — positive rolls right side up, negative rolls left side up.
  - If the user describes orientation using Viam's orientation vector format { x, y, z, th }, convert it to equivalent euler angles in your response.
  - Examples:
    - "rotate the sensor 90° to the left" → { yaw: 90 }
    - "tilt the camera down 30°" → { pitch: -30 }
    - "roll the end effector 45° clockwise" → { roll: -45 }
    - "point the arm forward and tilt it down 20°" → { yaw: 0, pitch: -20 }
- For parent, return the new parent frame name as a string.
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
