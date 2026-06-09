import { ChatAnthropic } from '@langchain/anthropic'
import { z } from 'zod'

const RequestSchema = z.object({
	prompt: z.string().min(1),
	anthropicKey: z.string().optional(),
	components: z.array(
		z.object({
			name: z.string(),
			frame: z.object({
				parent: z.string(),
				translation: z.object({ x: z.number(), y: z.number(), z: z.number() }),
				orientation: z.object({ roll: z.number(), pitch: z.number(), yaw: z.number() }),
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
			roll: z.number().min(-180).max(180).optional(),
			pitch: z.number().min(-180).max(180).optional(),
			yaw: z.number().min(-180).max(180).optional(),
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
	updates: z
		.array(FrameDeltaSchema)
		.describe(
			'One entry per component that needs to change. Always populate for any requested change — empty only if truly nothing needs to change.'
		),
	explanation: z
		.string()
		.describe('One sentence summarizing the changes made, e.g. "Rotated arm-1 yaw to 90°."'),
})

const CORS_HEADERS = { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' }

const SYSTEM_PROMPT = `You are a robot spatial configuration assistant. The user wants to adjust frame positions and orientations of robot components. Return only the components that need to change and only the fields being changed (delta — do not repeat unchanged fields).

Rules:
- Only modify components listed in the context below. Each component has a "name" field — use that exact string as "componentName" in your response.
- Return only components that actually need to change.
- For translation, return only the changed axes (x, y, z are each optional). All translation values are in millimeters.
- For orientation, current values are shown as { roll, pitch, yaw } in degrees. Return only the axes that are changing with their new absolute values.
  - Coordinate system: X is forward, Y is left, Z is up (right-handed).
  - yaw: rotation around Z — positive turns left, negative turns right.
  - pitch: rotation around Y — positive tilts nose up, negative tilts nose down.
  - roll: rotation around X — positive rolls right side up, negative rolls left side up.
  - For relative changes (e.g. "rotate 90° more"), add the delta to the current value and return the result. Normalize the result to [-180, 180] by wrapping (e.g. 190° → -170°).
  - If the user specifies Viam's orientation vector format { x, y, z, th }, convert it to euler angles.
  - Examples (assuming current orientation is 0/0/0 unless stated):
    - "rotate the sensor 90° to the left" → { yaw: 90 }
    - "tilt the camera down 30°" → { pitch: -30 }
    - "roll the end effector 45° clockwise" → { roll: -45 }
    - "rotate arm-1 yaw by +90° more" (current yaw 45°) → { yaw: 135 }
- For parent, return the new parent frame name as a string.
- Do not change geometry or attributes.
- For complex commands — those affecting more than one component, or more than two fields on a single component (e.g. moving an arm 200mm and re-parenting its gripper) — include a short "explanation" phrase on each delta describing what that specific change does (e.g. "move 200mm forward along X", "re-parent to updated arm"). Keep each explanation to one short phrase. Omit "explanation" for simple single-field changes.`

export async function handleSceneBuilder(req: Request): Promise<Response> {
	let body: unknown
	try {
		body = await req.json()
	} catch {
		return new Response('Invalid JSON body', { status: 400, headers: CORS_HEADERS })
	}

	const parsed = RequestSchema.safeParse(body)
	if (!parsed.success) {
		return new Response(`Invalid request: ${parsed.error.message}`, {
			status: 400,
			headers: CORS_HEADERS,
		})
	}

	const { prompt, components, anthropicKey } = parsed.data
	const apiKey = anthropicKey || process.env.ANTHROPIC_API_KEY
	if (!apiKey) {
		return new Response(
			'No Anthropic API key configured. Add one in Settings → AI or set ANTHROPIC_API_KEY before starting the server.',
			{ status: 401, headers: CORS_HEADERS }
		)
	}

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

		return Response.json(result, { status: 200, headers: CORS_HEADERS })
	} catch (error) {
		console.error('LLM error:', error)
		return new Response('LLM call failed', { status: 502, headers: CORS_HEADERS })
	}
}
