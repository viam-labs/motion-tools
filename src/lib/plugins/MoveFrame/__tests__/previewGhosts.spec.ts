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

const link = (name: string, parent: string, withGeometry = true): FrameDescriptor => ({
	kind: 'static',
	name,
	parent,
	localPose: new Pose(),
	geometry: withGeometry ? new Geometry({}) : null,
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

/** A two-step trajectory in which each named component moves and no other does. */
const moves = (...components: string[]): TrajectoryStep[] => [
	Object.fromEntries(components.map((name) => [name, [0]])),
	Object.fromEntries(components.map((name) => [name, [1]])),
]

const ghostedNames = (
	descriptors: FrameDescriptor[],
	trajectory: TrajectoryStep[] = moves('arm')
): string[] => {
	const ghosts = createPreviewGhosts()
	spawnPreviewGhosts(world, descriptors, trajectory, ghosts)
	return [...ghosts.keys()].toSorted()
}

/**
 * RDK answers with a column for every component in the frame system, so "appears in the trajectory"
 * and "the plan moves it" are different questions. Telling them apart is what keeps a second arm off
 * the screen.
 */
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

	/**
	 * `Number.EPSILON` (~2.22e-16) sits well inside the noise floor trajectory optimisation leaves on
	 * a component the plan holds still (measured up to 8.312169424984361e-10 rad in
	 * `salad-plan.json`'s `left-arm`), so on its own it is not motion. A difference has to clear
	 * `MOTION_TOLERANCE` to register.
	 */
	it('treats a difference inside the tolerance as still', () => {
		expect(movingComponents([{ arm: [0] }, { arm: [Number.EPSILON] }])).toEqual(new Set())
	})

	it('treats a difference outside the tolerance as moving', () => {
		expect(movingComponents([{ arm: [0] }, { arm: [1e-5] }])).toEqual(new Set(['arm']))
	})

	/**
	 * The falsifying case that retired the exact-equality rule, taken from the capture itself rather
	 * than synthesised: `salad-plan.json`'s 52-step `left-arm` is held by the plan, but drifts by up
	 * to 8.312169424984361e-10 rad from step 0 as trajectory optimisation runs, floating-point noise
	 * no byte-identity check could absorb. `right-arm` in the same capture genuinely moves, by
	 * 2.724693022178968 rad. Ghosting `left-arm` here would be `previewGhosts`'s founding failure,
	 * reintroduced by the very check meant to prevent it.
	 */
	it("holds a captured plan's idle left-arm still while its moving right-arm registers", () => {
		expect(movingComponents(parsePlan(saladPlan).trajectory)).toEqual(new Set(['right-arm']))
	})

	// Appearing partway is a change in its own right; the held `arm` alongside it is not.
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
	 * `sameInputs` (`planDoCommand.ts`) guards the identical hazard on the pair of steps it compares:
	 * a plain index into a step that does not own the component reads straight through to
	 * `Object.prototype`, so a component named `toString` read back as a member function whose
	 * `.length` happens to be a valid DoF count instead of `undefined`. The second loop has the same
	 * hole through `in`: `'toString' in first` is true even when no step ever names a `toString`
	 * component.
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

/**
 * A previewed plan should draw what the plan moves and nothing else. Ghosting every static frame
 * that happened to carry geometry drew translucent copies of both walls, the ceiling, the table and
 * both cameras, laid exactly on the originals — z-fighting with what they duplicate, adding
 * colliders that can only ever report touching themselves, and claiming the plan moves scenery.
 */
describe('which frames earn a ghost', () => {
	const chain = [
		link('arm:base', 'world'),
		joint('arm:waist', 'arm:base', 'arm'),
		link('arm:upper', 'arm:waist'),
		link('arm:flange', 'arm:upper'),
	]

	it('ghosts what the joint carries and leaves the base behind it alone', () => {
		expect(ghostedNames(chain)).toEqual(['arm:flange', 'arm:upper'])
	})

	// The reason the rule walks the parent chain instead of reading the trajectory's step keys: a
	// gripper is its own component and has no column, but it is bolted to the arm and moves with it.
	it('keeps a mounted gripper, which moves without a column of its own', () => {
		const mounted = [...chain, link('gripper:finger', 'arm:flange')]

		expect(ghostedNames(mounted)).toContain('gripper:finger')
	})

	/**
	 * The walk must not stop at the first joint it meets, only at a *moving* one. A gripper with
	 * fingers of its own has joints the plan holds still, and above them an arm it moves.
	 */
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

	/**
	 * The bug this fixes: on a dual-arm rig, previewing a left-arm move ghosted the whole right arm.
	 * Its links do sit under joints, so the "any joint above me" rule accepted them — and RDK reports
	 * a held component as the same values in every step, so those ghosts sat frozen on top of the live
	 * arm for the entire scrub, drifting the moment the real one moved.
	 */
	it('leaves out a second arm the plan holds still', () => {
		const twoArms = [
			...chain,
			link('right:base', 'world'),
			joint('right:waist', 'right:base', 'right'),
			link('right:upper', 'right:waist'),
		]

		expect(ghostedNames(twoArms, moves('arm'))).toEqual(['arm:flange', 'arm:upper'])
	})

	it('ghosts both arms when the plan moves both', () => {
		const twoArms = [
			...chain,
			link('right:base', 'world'),
			joint('right:waist', 'right:base', 'right'),
			link('right:upper', 'right:waist'),
		]

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
		const bare = [...chain, link('arm:mount', 'arm:waist', false)]

		expect(ghostedNames(bare)).not.toContain('arm:mount')
	})

	it('survives a parent chain that loops', () => {
		expect(ghostedNames([link('a', 'b'), link('b', 'a')])).toEqual([])
	})

	it('survives a parent that is not in the list', () => {
		expect(ghostedNames([link('orphan', 'nowhere')])).toEqual([])
	})

	/**
	 * Hiding geometry is a statement that it should not be considered — `moveGhosts` and
	 * `collectMembers` both already honour it. A ghost carries no `ChildOf`, so the invisibility
	 * cascade can never reach it; without an explicit check, everything hidden behind a `/` focus came
	 * back at 0.35 opacity and re-reported the very pairs the user hid to silence.
	 */
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
	const chain = [
		link('arm:base', 'world'),
		joint('arm:waist', 'arm:base', 'arm'),
		link('arm:upper', 'arm:waist'),
	]

	const spawned = () => {
		const ghosts = createPreviewGhosts()
		spawnPreviewGhosts(world, chain, moves('arm'), ghosts)
		return ghosts
	}

	it('names each one after the component it stands in for', () => {
		expect(spawned().get('arm:upper')!.get(PreviewOf)).toBe('arm')
	})

	/**
	 * Load-bearing rather than tidy: `resolveOrphans` indexes parents by name, so a ghost called
	 * `arm:upper` could capture the live entity's children, or lose its own — and it is destroyed on
	 * every `clear()`. Staying out of the hierarchy entirely is what makes the question moot.
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

	it('copies the geometry centre across, which the renderers offset by', () => {
		const centred = link('arm:upper', 'arm:waist')
		if (centred.kind === 'static') {
			centred.geometry = new Geometry({ center: { x: 5, y: 0, z: 0, oX: 0, oY: 0, oZ: 1 } })
		}
		const ghosts = createPreviewGhosts()

		spawnPreviewGhosts(world, [chain[0]!, chain[1]!, centred], moves('arm'), ghosts)

		expect(ghosts.get('arm:upper')!.get(traits.Center)?.x).toBe(5)
	})

	// The caller's map is the only handle its teardown has, so spawning twice must not orphan a set.
	it('replaces a previous set rather than adding to it', () => {
		const ghosts = createPreviewGhosts()
		spawnPreviewGhosts(world, chain, moves('arm'), ghosts)
		const first = [...ghosts.values()]

		spawnPreviewGhosts(world, chain, moves('arm'), ghosts)

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

/**
 * The instanced renderers rewrite matrices on `onChange`, so a ghost whose matrix is mutated in
 * place without signalling would sit frozen on screen for the whole scrub while every assertion that
 * reads the trait directly still passed.
 */
describe('applyPreviewStep', () => {
	const chain = [
		link('arm:base', 'world'),
		joint('arm:waist', 'arm:base', 'arm'),
		link('arm:upper', 'arm:waist'),
	]

	it('moves a ghost and tells the renderers it moved', () => {
		const changed: Entity[] = []
		world.onChange(traits.WorldMatrix, (entity) => changed.push(entity))

		const ghosts = createPreviewGhosts()
		spawnPreviewGhosts(world, chain, moves('arm'), ghosts)
		const ghost = ghosts.get('arm:upper')!
		changed.length = 0

		const target = new Matrix4().makeTranslation(1, 2, 3)
		applyPreviewStep(ghosts, new Map([['arm:upper', target]]))

		expect(ghost.get(traits.WorldMatrix)!.elements).toEqual(target.elements)
		expect(changed).toContain(ghost)
	})

	// Copied out of, not held: the forward-kinematics map is rewritten in place every step.
	it('copies the matrix rather than sharing the one it was handed', () => {
		const ghosts = createPreviewGhosts()
		spawnPreviewGhosts(world, chain, moves('arm'), ghosts)
		const source = new Matrix4().makeTranslation(1, 2, 3)

		applyPreviewStep(ghosts, new Map([['arm:upper', source]]))

		expect(ghosts.get('arm:upper')!.get(traits.WorldMatrix)).not.toBe(source)
	})

	it('leaves a ghost the step says nothing about where it is', () => {
		const ghosts = createPreviewGhosts()
		spawnPreviewGhosts(world, chain, moves('arm'), ghosts)
		const ghost = ghosts.get('arm:upper')!
		const before = ghost.get(traits.WorldMatrix)!.toArray()

		applyPreviewStep(ghosts, new Map())

		expect(ghost.get(traits.WorldMatrix)!.toArray()).toEqual(before)
	})

	it('skips a ghost that has already been destroyed', () => {
		const ghosts = createPreviewGhosts()
		spawnPreviewGhosts(world, chain, moves('arm'), ghosts)
		ghosts.get('arm:upper')!.destroy()

		expect(() => applyPreviewStep(ghosts, new Map([['arm:upper', new Matrix4()]]))).not.toThrow()
	})
})
