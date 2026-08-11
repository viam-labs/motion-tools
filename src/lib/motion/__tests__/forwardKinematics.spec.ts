import { Quaternion, Vector3 } from 'three'
import { describe, expect, it, vi } from 'vitest'

import { Pose } from '$lib/math'

import type { FrameDescriptor } from '../frameDescriptors'

import { createForwardKinematics } from '../forwardKinematics'

const uuid = () => new Uint8Array(16) as Uint8Array<ArrayBuffer>

const staticFrame = (name: string, parent: string, localPose: Pose): FrameDescriptor => ({
	kind: 'static',
	name,
	parent,
	localPose,
	geometry: null,
	uuid: uuid(),
})

const revolute = (
	name: string,
	parent: string,
	jointIndex: number,
	axis = { X: 0, Y: 0, Z: 1 }
): FrameDescriptor => ({
	kind: 'joint',
	motion: 'rotational',
	name,
	parent,
	axis,
	componentName: 'arm',
	jointIndex,
	uuid: uuid(),
})

/** Matrices are metres; `Pose` is millimetres. */
const positionOf = (matrix: import('three').Matrix4) =>
	new Vector3().setFromMatrixPosition(matrix).toArray()

describe('createForwardKinematics', () => {
	const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)

	const chain = [
		staticFrame('base', 'world', new Pose(0, 0, 100)),
		revolute('j1', 'base', 0),
		staticFrame('link', 'j1', new Pose(200, 0, 0)),
	]

	const cycle = () => [
		staticFrame('a', 'b', new Pose(0, 0, 10)),
		staticFrame('b', 'a', new Pose(0, 0, 20)),
	]

	it('composes each frame through its parents', () => {
		const fk = createForwardKinematics(chain)
		const matrices = fk({ arm: [0] })

		expect(positionOf(matrices.get('base')!)).toEqual([0, 0, 0.1])
		expect(positionOf(matrices.get('link')!)).toEqual([0.2, 0, 0.1])
	})

	it("drives joint frames from the step's inputs", () => {
		const fk = createForwardKinematics(chain)
		const [x, y, z] = positionOf(fk({ arm: [Math.PI / 2] }).get('link')!)

		expect(x).toBeCloseTo(0)
		expect(y).toBeCloseTo(0.2)
		expect(z).toBeCloseTo(0.1)
	})

	it('treats a missing joint column as zero rather than dropping the frame', () => {
		const fk = createForwardKinematics(chain)
		expect(positionOf(fk({}).get('link')!)).toEqual([0.2, 0, 0.1])
	})

	it('moves a prismatic joint along its axis, reading the value as millimetres', () => {
		const prismatic: FrameDescriptor = {
			kind: 'joint',
			motion: 'translational',
			name: 'j1',
			parent: 'base',
			axis: { X: 0, Y: 0, Z: 1 },
			componentName: 'arm',
			jointIndex: 0,
			uuid: uuid(),
		}

		const fk = createForwardKinematics([
			staticFrame('base', 'world', new Pose()),
			prismatic,
			staticFrame('tip', 'j1', new Pose()),
		])

		expect(positionOf(fk({ arm: [250] }).get('tip')!)).toEqual([0, 0, 0.25])
	})

	it('rewrites the same matrices on the next step rather than reallocating', () => {
		const fk = createForwardKinematics(chain)
		const first = fk({ arm: [0] }).get('link')!
		const second = fk({ arm: [Math.PI] }).get('link')!

		expect(second).toBe(first)
		expect(positionOf(second)[0]).toBeCloseTo(-0.2)
	})

	it('roots a subtree whose parent produced no descriptor', () => {
		const fk = createForwardKinematics([staticFrame('orphan', 'never-built', new Pose(0, 0, 50))])
		expect(positionOf(fk({}).get('orphan')!)).toEqual([0, 0, 0.05])
	})

	it('breaks a parent cycle instead of recursing forever', () => {
		const fk = createForwardKinematics(cycle())

		expect(() => fk({})).not.toThrow()
		expect(warn).toHaveBeenCalledWith(expect.stringContaining('cycle'))
	})

	it('names the frame it actually rooted, not the one the cycle was found at', () => {
		const matrices = createForwardKinematics(cycle())({})

		// The edge cut is `b -> a`, so `b` roots and `a` composes through it at 10 + 20.
		expect(positionOf(matrices.get('b')!)).toEqual([0, 0, 0.02])
		expect(positionOf(matrices.get('a')!)).toEqual([0, 0, 0.03])

		const message = warn.mock.calls[0]![0] as string
		expect(message).toContain('rooting "b"')
		expect(message).not.toContain('rooting "a"')
	})

	it('warns once per cycle edge rather than once per step', () => {
		const fk = createForwardKinematics(cycle())
		for (let step = 0; step < 5; step += 1) fk({})

		expect(warn).toHaveBeenCalledTimes(1)
	})

	it('does not let a cycle drift across steps', () => {
		const fk = createForwardKinematics(cycle())

		const first = positionOf(fk({}).get('a')!)
		fk({})
		expect(positionOf(fk({}).get('a')!)).toEqual(first)
	})

	it('computes a shared parent once and composes both children through it', () => {
		let baseReads = 0
		const basePose = new Pose(0, 0, 100)
		const base: FrameDescriptor = {
			kind: 'static',
			name: 'base',
			parent: 'world',
			get localPose() {
				baseReads += 1
				return basePose
			},
			geometry: null,
			uuid: uuid(),
		}

		const fk = createForwardKinematics([
			base,
			staticFrame('left', 'base', new Pose(0, 50, 0)),
			staticFrame('right', 'base', new Pose(0, -50, 0)),
		])
		const matrices = fk({})

		expect(positionOf(matrices.get('left')!)).toEqual([0, 0.05, 0.1])
		expect(positionOf(matrices.get('right')!)).toEqual([0, -0.05, 0.1])
		expect(baseReads).toBe(1)
	})

	it('returns every frame it was given', () => {
		const matrices = createForwardKinematics(chain)({ arm: [0] })
		expect([...matrices.keys()].toSorted()).toEqual(['base', 'j1', 'link'])
	})

	it('hands back the same map on every step', () => {
		const fk = createForwardKinematics(chain)
		expect(fk({ arm: [0] })).toBe(fk({ arm: [1] }))
	})

	it('ignores frames added to the descriptor array after it was built', () => {
		const descriptors = [...chain]
		const fk = createForwardKinematics(descriptors)

		descriptors.push(staticFrame('late', 'link', new Pose(0, 0, 10)))

		expect(fk({ arm: [0] }).has('late')).toBe(false)
	})

	// Addition is invisible to either implementation. Emptying the array is what separates walking the
	// construction-time snapshot from walking the live array.
	it('keeps resolving the chain it was built with after the array is emptied', () => {
		const descriptors = [...chain]
		const fk = createForwardKinematics(descriptors)
		fk({ arm: [0] })

		descriptors.length = 0

		expect(positionOf(fk({ arm: [Math.PI] }).get('link')!)[0]).toBeCloseTo(-0.2)
	})

	it('orients a leaf by its joint, not only positions it', () => {
		const matrices = createForwardKinematics(chain)({ arm: [Math.PI / 2] })
		const rotation = new Quaternion().setFromRotationMatrix(matrices.get('link')!)

		expect(
			rotation.angleTo(new Quaternion().setFromAxisAngle(new Vector3(0, 0, 1), Math.PI / 2))
		).toBeCloseTo(0)
	})

	// Descriptor order is load-bearing: `visiting.delete` runs before the pose is computed, so `link`
	// has to be on the stack when `j1` throws or nothing is stranded and the test proves nothing.
	it('recovers on the next step after one throws part-way through', () => {
		let axisReads = 0
		const flaky = {
			...revolute('j1', 'base', 0),
			get axis() {
				axisReads += 1
				if (axisReads === 1) throw new Error('malformed descriptor')
				return { X: 0, Y: 0, Z: 1 }
			},
		} as FrameDescriptor

		const fk = createForwardKinematics([
			staticFrame('base', 'world', new Pose(0, 0, 100)),
			staticFrame('link', 'j1', new Pose(200, 0, 0)),
			flaky,
		])

		expect(() => fk({ arm: [0] })).toThrow('malformed descriptor')

		expect(positionOf(fk({ arm: [0] }).get('link')!)).toEqual([0.2, 0, 0.1])
		expect(warn).not.toHaveBeenCalled()
	})
})
