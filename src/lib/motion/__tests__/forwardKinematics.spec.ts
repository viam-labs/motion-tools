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

	/**
	 * The frame the warning names is the one that gets rooted, which is not the frame the cycle was
	 * detected at. With `a` parented to `b` and `b` to `a`, resolution enters at `a`, reaches `b`,
	 * and finds `a` already on the stack: the edge cut is `b -> a`, so `b` is the root and `a` is
	 * composed *through* it at 10 + 20. Naming `a` described the one frame in the chain that is
	 * certainly not a root.
	 */
	it('names the frame it actually rooted, not the one the cycle was found at', () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)

		const fk = createForwardKinematics([
			staticFrame('a', 'b', new Pose(0, 0, 10)),
			staticFrame('b', 'a', new Pose(0, 0, 20)),
		])
		const matrices = fk({})

		expect(positionOf(matrices.get('b')!)).toEqual([0, 0, 0.02])
		expect(positionOf(matrices.get('a')!)).toEqual([0, 0, 0.03])

		const message = warn.mock.calls[0]![0] as string
		expect(message).toContain('rooting "b"')
		expect(message).not.toContain('rooting "a"')
		warn.mockRestore()
	})

	// A scrub redraws at frame rate, so warning per step turned one bad `parents` entry into hundreds
	// of identical lines: 250 over a 4 second playback.
	it('warns once per cycle edge rather than once per step', () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)

		const fk = createForwardKinematics([
			staticFrame('a', 'b', new Pose(0, 0, 10)),
			staticFrame('b', 'a', new Pose(0, 0, 20)),
		])
		for (let step = 0; step < 5; step += 1) fk({})

		expect(warn).toHaveBeenCalledTimes(1)
		warn.mockRestore()
	})

	// A cycle resolved once tells you nothing about a cycle resolved repeatedly, which is the only
	// way a scrub meets one. Returning the cached matrix instead of `undefined` composes a frame
	// against its own previous answer, so the subtree walks away from the origin every step.
	it('does not let a cycle drift across steps', () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)

		const fk = createForwardKinematics([
			staticFrame('a', 'b', new Pose(0, 0, 10)),
			staticFrame('b', 'a', new Pose(0, 0, 20)),
		])

		const first = positionOf(fk({}).get('a')!)
		fk({})
		expect(positionOf(fk({}).get('a')!)).toEqual(first)
		warn.mockRestore()
	})

	/**
	 * Two frames sharing a parent, which is the shape the whole memoize-and-mutate design turns on:
	 * the shared matrix must be written once and read twice, never rewritten after a child has
	 * already premultiplied by it. Every other fixture here is a linear chain, which cannot tell the
	 * difference.
	 *
	 * The `localPose` getter counts reads, so this pins the memoization as well as the geometry.
	 * Without it the answers stay correct and the work becomes O(frames x depth) on every rendered
	 * frame, which is invisible to an assertion about positions.
	 */
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

	// The docblock promises the same map back, not just the same matrices. Handing out a fresh copy
	// per step would satisfy every other assertion here while allocating one Map per rendered frame.
	it('hands back the same map on every step', () => {
		const fk = createForwardKinematics(chain)
		expect(fk({ arm: [0] })).toBe(fk({ arm: [1] }))
	})

	// The chain is snapshotted at construction, which is why the parameter is `readonly`.
	it('ignores frames added to the descriptor array after it was built', () => {
		const descriptors = [...chain]
		const fk = createForwardKinematics(descriptors)

		descriptors.push(staticFrame('late', 'link', new Pose(0, 0, 10)))

		expect(fk({ arm: [0] }).has('late')).toBe(false)
	})

	/**
	 * Removal is the direction that bites, and the one the assertion above cannot see: an added name
	 * is missing from the snapshot either way, so it stays out of the map whether the per-step loop
	 * walks the snapshot or the live array.
	 *
	 * Emptying it is what separates them. Walking the live array would resolve nothing on the next
	 * step while every matrix stayed in the returned map at its previous value - so a consumer reads
	 * a full set of frames, all silently one step behind, which is precisely the staleness the
	 * `resolved` set exists to make impossible.
	 */
	it('keeps resolving the chain it was built with after the array is emptied', () => {
		const descriptors = [...chain]
		const fk = createForwardKinematics(descriptors)
		fk({ arm: [0] })

		descriptors.length = 0

		expect(positionOf(fk({ arm: [Math.PI] }).get('link')!)[0]).toBeCloseTo(-0.2)
	})

	/**
	 * Position encodes a parent's rotation only through a child's offset, so a leaf frame's own
	 * orientation is unasserted by every position check in this file. A ghost is drawn with the
	 * frame's full matrix, so a leaf that is rotated wrongly renders wrongly with its origin in
	 * exactly the right place.
	 */
	it('orients a leaf by its joint, not only positions it', () => {
		const matrices = createForwardKinematics(chain)({ arm: [Math.PI / 2] })
		const rotation = new Quaternion().setFromRotationMatrix(matrices.get('link')!)

		expect(
			rotation.angleTo(new Quaternion().setFromAxisAngle(new Vector3(0, 0, 1), Math.PI / 2))
		).toBeCloseTo(0)
	})

	/**
	 * `computeJointPose` throws on a descriptor with no axis, and a throw escapes `resolve` without
	 * unwinding `visiting`. The per-step `clear()` is what makes the next step recover; without it
	 * the abandoned stack reads as a cycle through every frame still on it, so one bad step poisons
	 * the whole rest of the scrub - those frames stop resolving entirely rather than resolving
	 * wrongly.
	 *
	 * The descriptor order is load-bearing and not incidental. `visiting.delete(name)` runs before
	 * the local pose is computed, so a frame that throws while it is the outermost call leaves the
	 * set already clean. `link` has to be reached first so that `j1` throws with `link` still on the
	 * stack, which is the only shape that strands anything.
	 *
	 * Not reachable from RDK, whose `spatial.AxisConfig` always marshals X/Y/Z. It is reachable from
	 * any future descriptor source, and the failure is silent and permanent rather than loud and
	 * momentary, which is what makes it worth pinning.
	 */
	it('recovers on the next step after one throws part-way through', () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)

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
		warn.mockRestore()
	})
})
