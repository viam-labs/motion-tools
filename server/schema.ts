import { z } from 'zod'

export const geometrySchema = z.object({
	color: z.string().optional(),
	geometry: z.any(),
})
