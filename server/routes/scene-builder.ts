import { ChatAnthropic } from '@langchain/anthropic'
import { z } from 'zod'

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
})

const ResponseSchema = z.object({
	updates: z.array(FrameDeltaSchema),
	explanation: z.string(),
})

const CORS_HEADERS = { 'Access-Control-Allow-Origin': '*' }

const SYSTEM_PROMPT = `You are a robot spatial configuration assistant. The user wants to adjust frame positions and orientations of robot components. Return only the components that need to change and only the fields being changed (delta — do not repeat unchanged fields).

Rules:
- Only modify components listed in the context below. Each component has a "name" field — use that exact string as "componentName" in your response.
- Return only components that actually need to change.
- For translation, return only the changed axes (x, y, z are each optional).
- For orientation, return the full { x, y, z, th } orientation vector: (x,y,z) is the unit axis, th is the rotation angle in degrees.
- For parent, return the new parent frame name as a string.
- All translation values are in millimeters.
- Do not change geometry or attributes.`

export async function handleSceneBuilder(req: Request): Promise<Response> {
	const apiKey = process.env.ANTHROPIC_API_KEY
	if (!apiKey) {
		return new Response('ANTHROPIC_API_KEY not configured', { status: 500, headers: CORS_HEADERS })
	}

	let body: unknown
	try {
		body = await req.json()
	} catch {
		return new Response('Invalid JSON body', { status: 400, headers: CORS_HEADERS })
	}

	const parsed = RequestSchema.safeParse(body)
	if (!parsed.success) {
		return new Response(`Invalid request: ${parsed.error.message}`, { status: 400, headers: CORS_HEADERS })
	}

	const { prompt, components } = parsed.data

	const model = new ChatAnthropic({ model: 'claude-haiku-4-5-20251001', apiKey }).withStructuredOutput(
		ResponseSchema
	)

	try {
		const result = await model.invoke([
			{
				role: 'system',
				content: `${SYSTEM_PROMPT}\n\nCurrent components:\n${JSON.stringify(components, null, 2)}`,
			},
			{ role: 'user', content: prompt },
		])

		return new Response(JSON.stringify(result), {
			status: 200,
			headers: {
				'Content-Type': 'application/json',
				'Access-Control-Allow-Origin': '*',
			},
		})
	} catch (err) {
		console.error('LLM error:', err)
		return new Response('LLM call failed', { status: 502, headers: CORS_HEADERS })
	}
}
