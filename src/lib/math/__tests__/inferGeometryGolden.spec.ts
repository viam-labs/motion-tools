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

/**
 * The explanation for divergent cases are written down above `inferGeometryType` - in short,
 * the RDK uses config validation to make sure constructors for shapes get real values.
 * They are included here for the sake of completion, since these are inputs that can't
 * naturally arrive to this function.
 */
const RDK_VALIDATION_DIVERGENCES: Record<string, string> = {
	'declared box with a negative side': 'box',
	'declared sphere with a negative radius': 'sphere',
	'unrecognized declared type': 'bad',
	'infer capsule with no radius': 'capsule',
	'infer capsule shorter than its diameter': 'capsule',
	'infer capsule whose length equals its diameter': 'capsule',
}

const agreedCases = goldenCases.filter(
	(goldenCase) => !(goldenCase.name in RDK_VALIDATION_DIVERGENCES)
)

const divergentCases = Object.entries(RDK_VALIDATION_DIVERGENCES).map(([name, portResult]) => ({
	name,
	portResult,
	geometry: goldenByName.get(name)?.geometry,
}))

describe('inferGeometryType, against the types RDK resolved in geometry_infer_golden.json', () => {
	it('loads all 20 cases the Go generator wrote', () => {
		// Note: motivation is being brittle on purpose, such that when the number of cases changes
		// we are forced to take a look.
		expect(goldenCases.length).toBe(20)
	})

	it.each(agreedCases)('resolves $name to $resolvedType', ({ geometry, resolvedType }) => {
		expect(inferGeometryType(geometry)).toBe(resolvedType)
	})
})

describe('inferGeometryType, on the configs RDK builds no geometry from', () => {
	it.each(divergentCases)(
		'answers $portResult for $name, where RDK yields nothing',
		({ name, geometry, portResult }) => {
			expect(geometry, `the golden file no longer has a case named "${name}"`).toBeDefined()

			expect(inferGeometryType(geometry as RawGeometryJson)).toBe(portResult)
		}
	)

	it.each(divergentCases)(
		'records a real disagreement for $name, not one RDK has since resolved',
		({ name }) => {
			expect(goldenByName.get(name)?.resolvedType).not.toBe(RDK_VALIDATION_DIVERGENCES[name])
		}
	)
})
