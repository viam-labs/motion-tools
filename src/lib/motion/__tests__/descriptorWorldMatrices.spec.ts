import { Vector3 } from 'three'
import { describe, expect, it, vi } from 'vitest'

import { Pose } from '$lib/math'

import type { FrameDescriptor } from '../frameDescriptors'

import { createForwardKinematics } from '../descriptorWorldMatrices'

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
	// base 100mm up, a Z hinge on top of it, and a 200mm arm off the hinge.
	const chain = [
		staticFrame('base', 'world', new Pose(0, 0, 100)),
		revolute('j1', 'base', 0),
		staticFrame('link', 'j1', new Pose(200, 0, 0)),
	]

	it('composes each frame through its parents', () => {
		const fk = createForwardKinematics(chain)
		const matrices = fk({ arm: [0] })

		expect(positionOf(matrices.get('base')!)).toEqual([0, 0, 0.1])
		expect(positionOf(matrices.get('link')!)).toEqual([0.2, 0, 0.1])
	})

	it('drives joint frames from the step`s inputs', () => {
		const fk = createForwardKinematics(chain)
		const [x, y, z] = positionOf(fk({ arm: [Math.PI / 2] }).get('link')!)

		// A quarter turn about Z swings the arm from +X onto +Y, at the base's height.
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
		// `world`, and any frame the builder dropped as unhandled, resolve to identity — the subtree
		// lands at the scene root instead of vanishing.
		const fk = createForwardKinematics([staticFrame('orphan', 'never-built', new Pose(0, 0, 50))])
		expect(positionOf(fk({}).get('orphan')!)).toEqual([0, 0, 0.05])
	})

	it('breaks a parent cycle instead of recursing forever', () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)

		const fk = createForwardKinematics([
			staticFrame('a', 'b', new Pose(0, 0, 10)),
			staticFrame('b', 'a', new Pose(0, 0, 20)),
		])

		expect(() => fk({})).not.toThrow()
		expect(warn).toHaveBeenCalledWith(expect.stringContaining('cycle'))
		warn.mockRestore()
	})
})
