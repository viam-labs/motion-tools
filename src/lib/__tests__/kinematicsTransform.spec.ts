import { afterEach, describe, expect, it, vi } from 'vitest'

import {
	isDHModel,
	parseKinematicsGeometry,
	type RawKinematicsGeometry,
	type RawKinematicsModel,
	resolveOutputFrame,
} from '../kinematicsTransform'

/**
 * These cover the wire boundary: rdk marshals `LinkConfig` / `GeometryConfig`
 * with Go's capitalisation quirks (`{ X, Y, Z }` translations, a bare `Label`)
 * and infers geometry shape from whichever params are set when `type` is
 * omitted. Orientation decoding and the geometry-center frame convention live in
 * `spatialJson.spec.ts`; what's asserted here is the reshaping and the model
 * hierarchy questions.
 */

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

	/**
	 * A link geometry's offset is measured from the link's parent, so passing the
	 * link's own pose is what keeps it from being applied twice. Without it the
	 * offset is read as already-local — correct for an obstacle, wrong for a link.
	 */
	describe('relative to the owning link', () => {
		it('subtracts the link pose when one is given', () => {
			const parsed = parseKinematicsGeometry(
				{ type: 'sphere', r: 5, translation: { X: 15, Y: 0, Z: 0 } },
				{ translation: { X: 10, Y: 0, Z: 0 } }
			)

			expect(parsed.center?.x).toBeCloseTo(5)
		})

		it('treats the offset as already-local when no link pose is given', () => {
			const parsed = parseKinematicsGeometry({
				type: 'sphere',
				r: 5,
				translation: { X: 15, Y: 0, Z: 0 },
			})

			expect(parsed.center?.x).toBeCloseTo(15)
		})
	})
})

/**
 * Mirrors `ModelConfigJSON.ParseConfig`: `output_frames` wins, otherwise the one
 * leaf nothing hangs off of. rdk rejects models with more than one of either, so
 * this reports ambiguity rather than picking.
 */
describe('resolveOutputFrame', () => {
	const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
	afterEach(() => warn.mockClear())

	/** The xArm6 chain, as it arrives in `kinematics` — alternating link/joint. */
	const xArm6: RawKinematicsModel = {
		name: 'xArm6',
		links: [
			{ id: 'base', parent: 'world' },
			{ id: 'base_top', parent: 'waist' },
			{ id: 'upper_arm', parent: 'shoulder' },
			{ id: 'upper_forearm', parent: 'elbow' },
			{ id: 'lower_forearm', parent: 'forearm_rot' },
			{ id: 'wrist_link', parent: 'wrist' },
			{ id: 'gripper_mount', parent: 'gripper_rot' },
		],
		joints: [
			{ id: 'waist', parent: 'base' },
			{ id: 'shoulder', parent: 'base_top' },
			{ id: 'elbow', parent: 'upper_arm' },
			{ id: 'forearm_rot', parent: 'upper_forearm' },
			{ id: 'wrist', parent: 'lower_forearm' },
			{ id: 'gripper_rot', parent: 'wrist_link' },
		],
	}

	it('finds the single leaf of a real arm chain', () => {
		expect(resolveOutputFrame(xArm6)).toBe('gripper_mount')
		expect(warn).not.toHaveBeenCalled()
	})

	it('finds the single leaf of a one-joint gantry', () => {
		expect(
			resolveOutputFrame({
				name: 'test_gantry_model',
				links: [
					{ id: 'base', parent: 'world' },
					{ id: 'carriage', parent: 'gantry_joint' },
				],
				joints: [{ id: 'gantry_joint', parent: 'base' }],
			})
		).toBe('carriage')
	})

	it('prefers a declared output frame over the leaf', () => {
		expect(resolveOutputFrame({ ...xArm6, output_frames: ['wrist_link'] })).toBe('wrist_link')
	})

	/** Leaves are taken over joints too, matching rdk's `buildModelFrameSystem`. */
	it('resolves a chain that terminates in a joint', () => {
		expect(
			resolveOutputFrame({
				links: [{ id: 'base', parent: 'world' }],
				joints: [{ id: 'spin', parent: 'base' }],
			})
		).toBe('spin')
	})

	it('reports ambiguity rather than picking between two leaves', () => {
		expect(
			resolveOutputFrame({
				name: 'forked',
				links: [
					{ id: 'base', parent: 'world' },
					{ id: 'left', parent: 'base' },
					{ id: 'right', parent: 'base' },
				],
			})
		).toBeUndefined()
		expect(warn).toHaveBeenCalledWith(expect.stringContaining('2 leaf frames'))
	})

	it('reports more output frames than rdk accepts', () => {
		expect(resolveOutputFrame({ ...xArm6, output_frames: ['a', 'b'] })).toBeUndefined()
		expect(warn).toHaveBeenCalledWith(expect.stringContaining('rdk supports one'))
	})
})

/**
 * rdk builds a `"DH"` model from `dhParams` instead of `links`/`joints`, so one
 * yields no frames at all. Detecting it is what turns silence into a warning.
 */
describe('isDHModel', () => {
	it('recognises the declared param type', () => {
		expect(isDHModel({ kinematic_param_type: 'DH', dhParams: [{}] })).toBe(true)
	})

	it('recognises dhParams standing in for absent links', () => {
		expect(isDHModel({ dhParams: [{}, {}] })).toBe(true)
	})

	it('leaves an SVA model alone', () => {
		expect(isDHModel({ kinematic_param_type: 'SVA', links: [{ id: 'base' }] })).toBe(false)
	})

	it('leaves an untyped link model alone', () => {
		expect(isDHModel({ links: [{ id: 'base' }] })).toBe(false)
	})
})
