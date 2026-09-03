import { describe, expect, it } from 'vitest'

import { inferGeometryType, type RawGeometryJson } from '../geometryJson'
import goldenFile from '../rdk-math/testdata/geometry_infer_golden.json'

interface GoldenCase {
	name: string
	geometry: RawGeometryJson
	resolvedType: string
}

const goldenCases = goldenFile.cases as GoldenCase[]
const goldenByName = new Map(goldenCases.map((goldenCase) => [goldenCase.name, goldenCase]))

describe('inferGeometryType, against the types RDK resolved in geometry_infer_golden.json', () => {
	it('loads all 20 cases the Go generator wrote', () => {
		// Note: motivation is being brittle on purpose, such that when the number of cases changes 
		// we are forced to take a look.
		expect(goldenCases.length).toBe(14)
	})

	it.each(goldenCases)('resolves $name to $resolvedType', ({ geometry, resolvedType }) => {
		expect(inferGeometryType(geometry)).toBe(resolvedType)
	})
})
