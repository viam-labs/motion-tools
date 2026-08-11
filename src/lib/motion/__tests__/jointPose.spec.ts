import { Quaternion, Vector3 } from 'three'
import { describe, expect, it } from 'vitest'

import { Pose } from '$lib/math'

import type { FrameDescriptor, JointFrameDescriptor } from '../frameDescriptors'

import { computeJointPose, descriptorLocalPose, jointValueAt } from '../jointPose'

const uuid = () => new Uint8Array(16) as Uint8Array<ArrayBuffer>

const joint = (
	overrides: Partial<JointFrameDescriptor> & Pick<JointFrameDescriptor, 'motion'>
): JointFrameDescriptor => ({
	kind: 'joint',
	name: 'arm:j1',
	parent: 'arm:base',
	axis: { X: 0, Y: 0, Z: 1 },
	componentName: 'arm',
	jointIndex: 0,
	uuid: uuid(),
	...overrides,
})

/**
 * These two functions predate this PR, and until now nothing exercised them directly - they were
 * covered incidentally through `plan-to-snapshots.spec.ts`, whose fixtures all happen to declare
 * unit axes and zero mimic offsets. Two behaviours therefore had never executed with a value that
 * could distinguish them from their absence, and both of them are ones this PR newly depends on:
 * `descriptorLocalPose` routes the preview ghosts through the same arithmetic the replayer uses, so
 * a gripper's second finger is now drawn from it twice rather than once.
 */
describe('computeJointPose', () => {
	it('rotates about the declared axis by the step value in radians', () => {
		const pose = computeJointPose(joint({ motion: 'rotational' }), Math.PI / 2)

		expect(
			pose
				.toQuaternion()
				.angleTo(new Quaternion().setFromAxisAngle(new Vector3(0, 0, 1), Math.PI / 2))
		).toBeCloseTo(0)
		// A revolute joint contributes no translation; RDK's `NewPoseFromOrientation` leaves the dual
		// part zero.
		expect([pose.x, pose.y, pose.z]).toEqual([0, 0, 0])
	})

	it('slides along the declared axis by the step value in millimetres', () => {
		const pose = computeJointPose(joint({ motion: 'translational' }), 250)
		expect([pose.x, pose.y, pose.z]).toEqual([0, 0, 250])
	})

	/**
	 * A model's JSON axis is not required to be a unit vector, and RDK normalizes at two different
	 * moments depending on the joint: a translational frame does it on unmarshal, a rotational one
	 * inside `R4AA.ToQuat` at use. Without normalizing here a `{Z: 2}` prismatic travels twice as far
	 * as RDK moves it, which on a gantry is the difference between 0.25 m and 0.5 m.
	 */
	it.each([
		['translational', { X: 0, Y: 0, Z: 2 }, 250],
		['translational', { X: 0, Y: 0, Z: 0.5 }, 250],
	] as const)('normalizes a non-unit %s axis', (motion, axis, value) => {
		const pose = computeJointPose(joint({ motion, axis }), value)
		expect([pose.x, pose.y, pose.z]).toEqual([0, 0, value])
	})

	it('normalizes a non-unit rotational axis', () => {
		const scaled = computeJointPose(joint({ motion: 'rotational', axis: { X: 0, Y: 0, Z: 3 } }), 1)
		const unit = computeJointPose(joint({ motion: 'rotational' }), 1)

		expect(scaled.toQuaternion().angleTo(unit.toQuaternion())).toBeCloseTo(0)
	})

	/**
	 * `axis` comes off an unchecked cast in `frameDescriptors.ts`, so the type's guarantee of a
	 * well-formed vector does not hold at runtime. An absent axis used to throw an unhelpful
	 * "Cannot read properties of undefined" out of `vec3.set`; a zero-length axis is the worse case,
	 * since Three's `normalize()` guards `length() || 1` and lets `(0,0,0)` through unchanged, so it
	 * used to produce a silently meaningless orientation rather than an error.
	 */
	it.each([
		['an absent axis', undefined],
		['a zero-length axis', { X: 0, Y: 0, Z: 0 }],
	] as const)('throws a named error for %s', (_label, axis) => {
		expect(() => computeJointPose(joint({ motion: 'rotational', axis }), 1)).toThrow(/axis/)
	})
})

// NaN / Infinity in a trajectory step is not covered below. `Struct.toJson()` throws on a
// non-finite value before a trajectory can be built with one, so no route to reach `jointValueAt`
// with one was found; this is left for whoever next touches this function with a reason to add one.
describe('jointValueAt', () => {
	const step = { arm: [0.1, 0.2] }

	it('reads the component`s column at the joint`s index', () => {
		expect(jointValueAt(joint({ motion: 'rotational', jointIndex: 1 }), step)).toBeCloseTo(0.2)
	})

	it.each([
		['an absent component', {}],
		['a shorter column', { arm: [] }],
	])('falls back to zero for %s', (_label, inputs) => {
		expect(jointValueAt(joint({ motion: 'rotational' }), inputs)).toBe(0)
	})

	/**
	 * The offset term had never run with a non-zero value: both RDK mimic fixtures in this repo
	 * declare `offset: 0`, so dropping it entirely left the whole suite green. RDK derives a mimic as
	 * `multiplier*source + offset`, multiply then offset, and the order is not commutative - a
	 * gripper whose second finger mirrors the first about a non-zero rest position depends on it.
	 */
	it('applies a mimic as multiplier times source plus offset', () => {
		const mimic = joint({ motion: 'rotational', mimic: { multiplier: -1, offset: 0.5 } })
		expect(jointValueAt(mimic, step)).toBeCloseTo(-0.1 + 0.5)
	})

	it('is not the same as offset times multiplier plus source', () => {
		const mimic = joint({ motion: 'rotational', mimic: { multiplier: 2, offset: 1 } })
		// 2 * 0.1 + 1 = 1.2, where the transposed reading gives 1 * 0.1 + 2 = 2.1.
		expect(jointValueAt(mimic, step)).toBeCloseTo(1.2)
	})
})

describe('descriptorLocalPose', () => {
	it('returns a static frame`s configured pose unchanged', () => {
		const localPose = new Pose(1, 2, 3)
		const descriptor: FrameDescriptor = {
			kind: 'static',
			name: 'base',
			parent: 'world',
			localPose,
			geometry: null,
			uuid: uuid(),
		}

		expect(descriptorLocalPose(descriptor, {})).toBe(localPose)
	})

	it('drives a joint frame from the step', () => {
		const pose = descriptorLocalPose(joint({ motion: 'translational' }), { arm: [40] })
		expect([pose.x, pose.y, pose.z]).toEqual([0, 0, 40])
	})

	// The point of the helper: the replayer and the preview ghosts derive the pose from one place, so
	// a mimic cannot come out differently in the two views of the same plan.
	it('resolves a mimic joint the same way for either consumer', () => {
		const mimic = joint({
			motion: 'rotational',
			mimic: { multiplier: -1, offset: 0.25 },
		})

		expect(descriptorLocalPose(mimic, { arm: [0.5] })).toEqual(
			computeJointPose(mimic, jointValueAt(mimic, { arm: [0.5] }))
		)
	})
})
