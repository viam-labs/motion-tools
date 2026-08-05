import { MathUtils, Quaternion, Vector3 } from 'three'
import { describe, expect, it } from 'vitest'

import {
	createPoseFromOrientation,
	parseKinematicsGeometry,
	type RawKinematicsGeometry,
	type RawKinematicsOrientation,
} from '../kinematicsTransform'

/**
 * These cover the wire boundary: rdk marshals `LinkConfig` / `GeometryConfig`
 * with Go's capitalisation quirks (`{ X, Y, Z }` translations, a bare `Label`)
 * and infers geometry shape from whichever params are set when `type` is
 * omitted. The conversions themselves belong to `Pose` — `pose.spec.ts` owns
 * those — so what's asserted here is the reshaping.
 */

/** Compare orientations by the rotation they produce, not by field values. */
const rotates = (pose: ReturnType<typeof createPoseFromOrientation>, from: Vector3) =>
	from.clone().applyQuaternion(pose.toQuaternion())

const expectVectorClose = (actual: Vector3, expected: [number, number, number]) => {
	expect(actual.x).toBeCloseTo(expected[0], 5)
	expect(actual.y).toBeCloseTo(expected[1], 5)
	expect(actual.z).toBeCloseTo(expected[2], 5)
}

describe('createPoseFromOrientation', () => {
	it('reads capitalised translation fields as millimetres', () => {
		const pose = createPoseFromOrientation({ X: 10, Y: -20, Z: 30 })

		expect(pose.x).toBe(10)
		expect(pose.y).toBe(-20)
		expect(pose.z).toBe(30)
	})

	it('defaults to the identity orientation when translation-only', () => {
		const pose = createPoseFromOrientation({ X: 1 })

		expect(pose.oX).toBe(0)
		expect(pose.oY).toBe(0)
		expect(pose.oZ).toBe(1)
		expect(pose.theta).toBe(0)
	})

	it('defaults a missing pose to the origin', () => {
		const pose = createPoseFromOrientation()

		expect(pose.x).toBe(0)
		expect(pose.y).toBe(0)
		expect(pose.z).toBe(0)
		expect(pose.oZ).toBe(1)
	})

	/**
	 * Every case is the same rotation — 90° about +X — spelled four ways, so the
	 * assertion can be shared: +Y maps to +Z.
	 */
	const quarterTurnAboutX: [string, RawKinematicsOrientation][] = [
		['ov_degrees (default, no type)', { value: { x: 0, y: -1, z: 0, th: 90 } }],
		['ov_degrees', { type: 'ov_degrees', value: { x: 0, y: -1, z: 0, th: 90 } }],
		[
			'ov_radians',
			{ type: 'ov_radians', value: { x: 0, y: -1, z: 0, th: MathUtils.degToRad(90) } },
		],
		['quaternion', { type: 'quaternion', value: { X: Math.SQRT1_2, Y: 0, Z: 0, W: Math.SQRT1_2 } }],
		['euler_angles', { type: 'euler_angles', value: { roll: Math.PI / 2, pitch: 0, yaw: 0 } }],
	]

	it.each(quarterTurnAboutX)('reads a 90° turn about +X from %s', (_label, orientation) => {
		const pose = createPoseFromOrientation(undefined, orientation)

		expectVectorClose(rotates(pose, new Vector3(0, 1, 0)), [0, 0, 1])
	})

	it('agrees with three.js on a quaternion round trip', () => {
		const source = new Quaternion().setFromAxisAngle(new Vector3(1, 2, 3).normalize(), 0.7)
		const pose = createPoseFromOrientation(undefined, {
			type: 'quaternion',
			value: { X: source.x, Y: source.y, Z: source.z, W: source.w },
		})

		const point = new Vector3(4, 5, 6)
		const expected = point.clone().applyQuaternion(source)

		expectVectorClose(rotates(pose, point), [expected.x, expected.y, expected.z])
	})
})

describe('parseKinematicsGeometry', () => {
	const geometry = (raw: RawKinematicsGeometry) => parseKinematicsGeometry(raw)

	it('reads the Go-capitalised Label', () => {
		expect(geometry({ type: 'sphere', r: 5, Label: 'wrist' }).label).toBe('wrist')
	})

	it('defaults a missing label to empty', () => {
		expect(geometry({ type: 'sphere', r: 5 }).label).toBe('')
	})

	it('offsets the geometry by its own translation', () => {
		const parsed = geometry({ type: 'sphere', r: 5, translation: { X: 1, Y: 2, Z: 3 } })

		expect(parsed.center?.x).toBe(1)
		expect(parsed.center?.y).toBe(2)
		expect(parsed.center?.z).toBe(3)
	})

	describe('with an explicit type', () => {
		it('reads a box', () => {
			expect(geometry({ type: 'box', x: 1, y: 2, z: 3 }).geometryType).toEqual({
				case: 'box',
				value: { dimsMm: { x: 1, y: 2, z: 3 } },
			})
		})

		it('reads a sphere', () => {
			expect(geometry({ type: 'sphere', r: 7 }).geometryType).toEqual({
				case: 'sphere',
				value: { radiusMm: 7 },
			})
		})

		it('reads a capsule', () => {
			expect(geometry({ type: 'capsule', r: 2, l: 9 }).geometryType).toEqual({
				case: 'capsule',
				value: { radiusMm: 2, lengthMm: 9 },
			})
		})

		it('trusts the type over the params — a capsule missing its length stays a capsule', () => {
			expect(geometry({ type: 'capsule', r: 2 }).geometryType).toEqual({
				case: 'capsule',
				value: { radiusMm: 2, lengthMm: 0 },
			})
		})

		it('has no case for shapes the SDK geometry union cannot express', () => {
			expect(geometry({ type: 'cylinder', r: 2, l: 9 }).geometryType.case).toBeUndefined()
			expect(geometry({ type: 'point' }).geometryType.case).toBeUndefined()
		})
	})

	/** Mirrors rdk's `GeometryConfig.ParseConfig` `UnknownType` branch. */
	describe('with no type', () => {
		it('infers a box from any non-zero dimension', () => {
			expect(geometry({ z: 3 }).geometryType).toEqual({
				case: 'box',
				value: { dimsMm: { x: 0, y: 0, z: 3 } },
			})
		})

		it('prefers a box over a capsule when both are specified', () => {
			expect(geometry({ x: 1, y: 1, z: 1, r: 2, l: 9 }).geometryType.case).toBe('box')
		})

		it('infers a capsule from a length', () => {
			expect(geometry({ r: 2, l: 9 }).geometryType).toEqual({
				case: 'capsule',
				value: { radiusMm: 2, lengthMm: 9 },
			})
		})

		it('infers a sphere from a radius alone', () => {
			expect(geometry({ r: 2 }).geometryType).toEqual({
				case: 'sphere',
				value: { radiusMm: 2 },
			})
		})

		it('infers nothing from an empty config', () => {
			expect(geometry({}).geometryType.case).toBeUndefined()
		})
	})
})
