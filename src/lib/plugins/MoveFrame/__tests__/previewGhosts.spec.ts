import { createWorld, type Entity } from 'koota'
import { Matrix4 } from 'three'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import type { FrameDescriptor } from '$lib/motion/frameDescriptors'
import type { TrajectoryStep } from '$lib/motion/jointPose'

import { Geometry } from '$lib/buf/common/v1/common_pb'
import { relations, traits } from '$lib/ecs'
import { Pose } from '$lib/math'

import saladPlan from '../../MotionPlanReplayer/__tests__/__fixtures__/salad-plan.json?raw'
import { parsePlan } from '../../MotionPlanReplayer/parse-plan'
import {
	applyPreviewStep,
	clearPreviewGhosts,
	createPreviewGhosts,
	movingComponents,
	type PreviewGhosts,
	spawnPreviewGhosts,
} from '../previewGhosts'
import { PreviewOf } from '../traits'

let world: ReturnType<typeof createWorld>

beforeEach(() => {
	world = createWorld()
})

// Koota allocates world ids from a pool of 16 and only `destroy` returns one.
afterEach(() => {
	world.destroy()
})

const uuid = () => new Uint8Array(16) as Uint8Array<ArrayBuffer>

const link = (
	name: string,
	parent: string,
	geometry: Geometry | null = new Geometry({})
): FrameDescriptor => ({
	kind: 'static',
	name,
	parent,
	localPose: new Pose(),
	geometry,
	uuid: uuid(),
})

const joint = (name: string, parent: string, componentName: string): FrameDescriptor => ({
	kind: 'joint',
	motion: 'rotational',
	name,
	parent,
	axis: { X: 0, Y: 0, Z: 1 },
	componentName,
	jointIndex: 0,
	uuid: uuid(),
})

const moves = (...components: string[]): TrajectoryStep[] => [
	Object.fromEntries(components.map((name) => [name, [0]])),
	Object.fromEntries(components.map((name) => [name, [1]])),
]

const armChain = [
	link('arm:base', 'world'),
	joint('arm:waist', 'arm:base', 'arm'),
	link('arm:upper', 'arm:waist'),
]

const ghostedNames = (
	descriptors: FrameDescriptor[],
	trajectory: TrajectoryStep[] = moves('arm')
): string[] => {
	const ghosts = createPreviewGhosts()
	spawnPreviewGhosts(world, descriptors, trajectory, ghosts)
	return [...ghosts.keys()].toSorted()
}

const spawned = (): PreviewGhosts => {
	const ghosts = createPreviewGhosts()
	spawnPreviewGhosts(world, armChain, moves('arm'), ghosts)
	return ghosts
}

/** RDK answers with a column for every component in the frame system, not just the ones it moved. */
describe('movingComponents', () => {
	it('names a component whose values change', () => {
		expect(movingComponents(moves('arm'))).toEqual(new Set(['arm']))
	})

	it('leaves out one RDK repeats unchanged, which is how it reports a component it held still', () => {
		const trajectory: TrajectoryStep[] = [
			{ 'left-arm': [0, 0], 'right-arm': [1.5, -0.2] },
			{ 'left-arm': [1, 1], 'right-arm': [1.5, -0.2] },
		]

		expect(movingComponents(trajectory)).toEqual(new Set(['left-arm']))
	})

	it('treats a difference inside the tolerance as still', () => {
		expect(movingComponents([{ arm: [0] }, { arm: [Number.EPSILON] }])).toEqual(new Set())
	})

	it('treats a difference outside the tolerance as moving', () => {
		expect(movingComponents([{ arm: [0] }, { arm: [1e-5] }])).toEqual(new Set(['arm']))
	})

	/**
	 * The 52-step capture holds `left-arm` but its values still drift 8.3e-10 rad from step 0 as
	 * trajectory optimization runs. `right-arm` moves 2.7 rad, nine orders above that.
	 */
	it("holds a captured plan's idle left-arm still while its moving right-arm registers", () => {
		expect(movingComponents(parsePlan(saladPlan).trajectory)).toEqual(new Set(['right-arm']))
	})

	it('counts a component that appears partway as moving', () => {
		expect(movingComponents([{ arm: [0] }, { arm: [0], gripper: [1] }])).toEqual(
			new Set(['gripper'])
		)
	})

	it('counts a component that vanishes partway as moving', () => {
		expect(movingComponents([{ arm: [0], gripper: [1] }, { arm: [0] }])).toEqual(
			new Set(['gripper'])
		)
	})

	it('reads the zero-DoF columns RDK pads the reply with as still', () => {
		expect(
			movingComponents([
				{ arm: [0], camera: [] },
				{ arm: [1], camera: [] },
			])
		).toEqual(new Set(['arm']))
	})

	/**
	 * A plain index into a step that does not own the component reads through to `Object.prototype`,
	 * where `toString.length` is a valid DoF count rather than `undefined`.
	 */
	it.each<[string, TrajectoryStep[], string[]]>([
		['vanishes after the first step', [{ toString: [], arm: [0] }, { arm: [0] }], ['toString']],
		['appears after the first step', [{ arm: [0] }, { arm: [0], toString: [1] }], ['toString']],
	])(
		'reads a component sharing a name with an Object member as data when it %s',
		(_label, trajectory, expected) => {
			expect(movingComponents(trajectory)).toEqual(new Set(expected))
		}
	)

	it('is empty for a trajectory with no steps', () => {
		expect(movingComponents([])).toEqual(new Set())
	})
})

describe('which frames earn a ghost', () => {
	const chain = [...armChain, link('arm:flange', 'arm:upper')]

	const twoArms = [
		...chain,
		link('right:base', 'world'),
		joint('right:waist', 'right:base', 'right'),
		link('right:upper', 'right:waist'),
	]

	it('ghosts what the joint carries and leaves the base behind it alone', () => {
		expect(ghostedNames(chain)).toEqual(['arm:flange', 'arm:upper'])
	})

	it('keeps a mounted gripper, which moves without a column of its own', () => {
		const mounted = [...chain, link('gripper:finger', 'arm:flange')]

		expect(ghostedNames(mounted)).toContain('gripper:finger')
	})

	it('walks past a joint the plan holds still to the moving one above it', () => {
		const mounted = [
			...chain,
			joint('gripper:knuckle', 'arm:flange', 'gripper'),
			link('gripper:finger', 'gripper:knuckle'),
		]
		const trajectory: TrajectoryStep[] = [
			{ arm: [0], gripper: [0.5] },
			{ arm: [1], gripper: [0.5] },
		]

		expect(ghostedNames(mounted, trajectory)).toContain('gripper:finger')
	})

	it('leaves out a second arm the plan holds still', () => {
		expect(ghostedNames(twoArms, moves('arm'))).toEqual(['arm:flange', 'arm:upper'])
	})

	it('ghosts both arms when the plan moves both', () => {
		expect(ghostedNames(twoArms, moves('arm', 'right'))).toEqual([
			'arm:flange',
			'arm:upper',
			'right:upper',
		])
	})

	it('leaves scenery out entirely', () => {
		const scene = [...chain, link('obstacle-table', 'world'), link('obstacle-wall', 'world')]

		expect(ghostedNames(scene)).toEqual(['arm:flange', 'arm:upper'])
	})

	it('skips frames with no shape rather than drawing them as triads', () => {
		const bare = [...chain, link('arm:mount', 'arm:waist', null)]

		expect(ghostedNames(bare)).not.toContain('arm:mount')
	})

	it('survives a parent chain that loops', () => {
		expect(ghostedNames([link('a', 'b'), link('b', 'a')])).toEqual([])
	})

	it('survives a parent that is not in the list', () => {
		expect(ghostedNames([link('orphan', 'nowhere')])).toEqual([])
	})

	describe('hidden geometry', () => {
		it('skips a frame the user hid directly', () => {
			world.spawn(traits.Name('arm:upper'), traits.Invisible)

			expect(ghostedNames(chain)).toEqual(['arm:flange'])
		})

		it('skips a frame hidden by an ancestor', () => {
			world.spawn(traits.Name('arm:flange'), traits.InheritedInvisible)

			expect(ghostedNames(chain)).toEqual(['arm:upper'])
		})

		it('keeps a frame whose live twin is visible', () => {
			world.spawn(traits.Name('arm:upper'))

			expect(ghostedNames(chain)).toEqual(['arm:flange', 'arm:upper'])
		})
	})
})

describe('the ghosts themselves', () => {
	it('names each one after the component it stands in for', () => {
		expect(spawned().get('arm:upper')!.get(PreviewOf)).toBe('arm')
	})

	/**
	 * `resolveOrphans` indexes parents by name, so a named ghost could capture the live entity's
	 * children, or lose its own, and it is destroyed on every `clear()`.
	 */
	it('carries no name and no parent, so it cannot be mistaken for a real frame', () => {
		const ghost = spawned().get('arm:upper')!

		expect(ghost.has(traits.Name)).toBe(false)
		expect(ghost.targetFor(relations.ChildOf)).toBeUndefined()
	})

	it('carries the traits the renderers and the picker read', () => {
		const ghost = spawned().get('arm:upper')!

		expect(ghost.has(traits.NonSelectable)).toBe(true)
		expect(ghost.get(traits.Opacity)).toBe(0.35)
		expect(ghost.has(traits.Color)).toBe(true)
		expect(ghost.has(traits.WorldMatrix)).toBe(true)
	})

	it('copies the geometry center across, which the renderers offset by', () => {
		const centered = link(
			'arm:upper',
			'arm:waist',
			new Geometry({ center: { x: 5, y: 0, z: 0, oX: 0, oY: 0, oZ: 1 } })
		)
		const ghosts = createPreviewGhosts()

		spawnPreviewGhosts(world, [armChain[0]!, armChain[1]!, centered], moves('arm'), ghosts)

		expect(ghosts.get('arm:upper')!.get(traits.Center)?.x).toBe(5)
	})

	it('replaces a previous set rather than adding to it', () => {
		const ghosts = spawned()
		const first = [...ghosts.values()]

		spawnPreviewGhosts(world, armChain, moves('arm'), ghosts)

		expect(first.every((entity) => !entity.isAlive())).toBe(true)
		expect(world.query(PreviewOf)).toHaveLength(ghosts.size)
	})

	it('drops every one on clear', () => {
		const ghosts = spawned()

		clearPreviewGhosts(ghosts)

		expect(ghosts.size).toBe(0)
		expect(world.query(PreviewOf)).toHaveLength(0)
	})
})

describe('applyPreviewStep', () => {
	/**
	 * The instanced renderers rewrite matrices on `onChange`, so a ghost mutated in place without
	 * signaling sits frozen on screen while an assertion reading the trait directly still passes.
	 */
	it('moves a ghost and tells the renderers it moved', () => {
		const changed: Entity[] = []
		world.onChange(traits.WorldMatrix, (entity) => changed.push(entity))

		const ghosts = spawned()
		const ghost = ghosts.get('arm:upper')!
		changed.length = 0

		const target = new Matrix4().makeTranslation(1, 2, 3)
		applyPreviewStep(ghosts, new Map([['arm:upper', target]]))

		expect(ghost.get(traits.WorldMatrix)!.elements).toEqual(target.elements)
		expect(changed).toContain(ghost)
	})

	it('copies the matrix rather than sharing the one it was handed', () => {
		const ghosts = spawned()
		const source = new Matrix4().makeTranslation(1, 2, 3)

		applyPreviewStep(ghosts, new Map([['arm:upper', source]]))

		expect(ghosts.get('arm:upper')!.get(traits.WorldMatrix)).not.toBe(source)
	})

	it('leaves a ghost the step says nothing about where it is', () => {
		const ghosts = spawned()
		const ghost = ghosts.get('arm:upper')!
		const before = ghost.get(traits.WorldMatrix)!.toArray()

		applyPreviewStep(ghosts, new Map())

		expect(ghost.get(traits.WorldMatrix)!.toArray()).toEqual(before)
	})

	it('skips a ghost that has already been destroyed', () => {
		const ghosts = spawned()
		ghosts.get('arm:upper')!.destroy()

		expect(() => applyPreviewStep(ghosts, new Map([['arm:upper', new Matrix4()]]))).not.toThrow()
	})
})
