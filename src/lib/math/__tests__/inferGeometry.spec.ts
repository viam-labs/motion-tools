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
 * The cases where the port answers differently from RDK on purpose, and what it answers instead.
 * RDK resolves a type by constructing the shape, so a config it refuses yields no geometry at all,
 * while the port reads the dimensions and stops. Every one of these needs a config RDK already
 * rejected upstream, so the divergence is unreachable in practice. See `inferGeometryType`.
 *
 * Listing them here is what keeps that claim falsifiable. A golden case absent from this table has
 * to match RDK exactly, so a new case added on the Go side is checked without being registered.
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
		// TODO: needed check? motivation is in case the number of cases fails, this breaks and forces to take a
		expect(goldenCases.length).toBe(20)
	})

	it.each(agreedCases)('resolves $name to $resolvedType', ({ geometry, resolvedType }) => {
		expect(inferGeometryType(geometry)).toBe(resolvedType)
	})
})

// TODO: add explanation for divergent cases
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
