import { describe, expect, it } from 'vitest'

import type { JointJson } from '../model-joint-columns'

import { modelJointColumns } from '../model-joint-columns'
import gripperModel from './__fixtures__/rdk-mimic-gripper-model.json'
import serialModel from './__fixtures__/rdk-mimic-serial-model.json'

const indices = (joints: JointJson[]): Record<string, number | undefined> =>
	Object.fromEntries(joints.map((j) => [j.id, modelJointColumns(joints).get(j.id)?.index]))

describe('joints with no mimic among them', () => {
	it('numbers them in declaration order', () => {
		expect(indices([{ id: 'a' }, { id: 'b' }, { id: 'c' }])).toEqual({ a: 0, b: 1, c: 2 })
	})

	it('gives every joint a column and no mapping', () => {
		const columns = modelJointColumns([{ id: 'a' }, { id: 'b' }])
		// `every` is vacuously true on an empty map, so the size is what makes this an assertion.
		expect(columns.size).toBe(2)
		expect([...columns.values()].every((c) => c.mimic === undefined)).toBe(true)
	})
})

// The two fixtures are byte-for-byte copies of `referenceframe/testfiles/`, and RDK's own tests
// (`TestMimicGripperModel`, `TestMimicSerialModel`) state the DoF each one has: 1 for the gripper, 2 for the
// serial arm. That count is exactly the number of columns a trajectory step carries for it.
describe("RDK's own mimic models", () => {
	it('gives the gripper one column, shared by both fingers', () => {
		const columns = modelJointColumns(gripperModel.joints)

		expect(columns.get('left_joint')).toEqual({ index: 0 })
		expect(columns.get('right_joint')).toEqual({ index: 0, mimic: { multiplier: 1, offset: 0 } })
		expect(new Set([...columns.values()].map((c) => c.index)).size).toBe(1)
	})

	it('gives the serial arm two columns and drives its third joint from the first', () => {
		const columns = modelJointColumns(serialModel.joints)

		expect(columns.get('joint1')).toEqual({ index: 0 })
		expect(columns.get('joint2')).toEqual({ index: 1 })
		expect(columns.get('joint3')).toEqual({ index: 0, mimic: { multiplier: -1, offset: 0 } })
	})
})

// The whole point of the exercise: a mimic occupies a frame but not a slot, so treating the array
// index as the slot moves every joint below it onto its neighbour's column.
describe('a mimic joint in the middle of a chain', () => {
	const joints: JointJson[] = [
		{ id: 'shoulder' },
		{ id: 'knuckle', mimic: { joint: 'shoulder' } },
		{ id: 'elbow' },
		{ id: 'wrist' },
	]

	it('shifts every joint declared after it up one column', () => {
		expect(indices(joints)).toEqual({ shoulder: 0, knuckle: 0, elbow: 1, wrist: 2 })
	})

	it('leaves the columns contiguous from zero', () => {
		const owned = [...modelJointColumns(joints)]
			.filter(([, column]) => !column.mimic)
			.map(([, column]) => column.index)

		expect(owned.toSorted((a, b) => a - b)).toEqual([0, 1, 2])
	})

	// Every other case here mimics the first joint, so `index: source.index` and a hardcoded
	// `index: 0` are the same answer. This one borrows a column that is not zero, which is the only
	// shape that says the borrowed index is read off the source rather than assumed.
	it('borrows the source`s own column, not the first one', () => {
		const columns = modelJointColumns([
			{ id: 'first' },
			{ id: 'second' },
			{ id: 'follows_second', mimic: { joint: 'second' } },
			{ id: 'after' },
		])

		expect(columns.get('follows_second')).toEqual({
			index: 1,
			mimic: { multiplier: 1, offset: 0 },
		})
		expect(columns.get('after')).toEqual({ index: 2 })
	})
})

describe('the linear map a mimic applies', () => {
	it('reads a multiplier and an offset off the joint', () => {
		const columns = modelJointColumns([
			{ id: 'drive' },
			{ id: 'follower', mimic: { joint: 'drive', multiplier: 0.5, offset: 2 } },
		])

		expect(columns.get('follower')?.mimic).toEqual({ multiplier: 0.5, offset: 2 })
	})

	// RDK's `MimicConfig.EffectiveMultiplier`: the field is `omitempty`, so an absent one and an
	// explicit 0 arrive identically, and neither can mean "hold this joint at the offset".
	it.each([undefined, 0])('reads a %s multiplier as 1', (multiplier) => {
		const columns = modelJointColumns([
			{ id: 'drive' },
			{ id: 'follower', mimic: { joint: 'drive', multiplier, offset: 3 } },
		])

		expect(columns.get('follower')?.mimic).toEqual({ multiplier: 1, offset: 3 })
	})

	// `buildMimicMappings` composes the same way: a = m₁(m₂c + o₂) + o₁.
	it('composes a chain down to the joint that owns the column', () => {
		const columns = modelJointColumns([
			{ id: 'c' },
			{ id: 'b', mimic: { joint: 'c', multiplier: 3, offset: 5 } },
			{ id: 'a', mimic: { joint: 'b', multiplier: 2, offset: 1 } },
		])

		expect(columns.get('a')).toEqual({ index: 0, mimic: { multiplier: 6, offset: 11 } })
		expect(columns.get('b')).toEqual({ index: 0, mimic: { multiplier: 3, offset: 5 } })
	})
})

// RDK refuses to build any of these, so they only reach us from hand-written config. Leaving the
// joint out of the map drops its frame, which reads better than driving it off an unrelated column.
describe('mimics that name no reachable source', () => {
	it('drops a joint whose source does not exist', () => {
		const columns = modelJointColumns([{ id: 'a' }, { id: 'b', mimic: { joint: 'ghost' } }])

		expect(columns.has('b')).toBe(false)
		expect(columns.get('a')).toEqual({ index: 0 })
	})

	it('drops both halves of a cycle rather than looping', () => {
		const columns = modelJointColumns([
			{ id: 'a', mimic: { joint: 'b' } },
			{ id: 'b', mimic: { joint: 'a' } },
		])

		expect([...columns.keys()]).toEqual([])
	})

	it('drops a joint that mimics itself', () => {
		expect(modelJointColumns([{ id: 'a', mimic: { joint: 'a' } }]).has('a')).toBe(false)
	})
})
