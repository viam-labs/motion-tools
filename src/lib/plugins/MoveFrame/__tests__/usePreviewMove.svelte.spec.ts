import type { JsonValue } from '@bufbuild/protobuf'

import { Struct } from '@bufbuild/protobuf'
import { PoseInFrame, robotApi, Transform } from '@viamrobotics/sdk'
import { Matrix4 } from 'three'
import { afterEach, describe, expect, it } from 'vitest'

import { traits } from '$lib/ecs'
import { parsePlan } from '$lib/plugins/MotionPlanReplayer/parse-plan'

import planJson from '../../MotionPlanReplayer/__tests__/__fixtures__/plan.json?raw'
import { PreviewOf } from '../traits'
import {
	createPreviewMoveHarness,
	type PreviewMoveHarness,
} from './__fixtures__/previewMoveHarness.svelte'

const dump = parsePlan(planJson)

/**
 * A part's `kinematics` carries the same `ModelConfigJSON` the dump nests under
 * `frames['arm-1'].frame.model`, so a realistic frame system can be lifted out of the fixture
 * instead of hand-written — geometry, joint chain and all.
 */
const kinematicsFromDump = (partName: string): Struct => {
	const entry = dump.frames[partName]
	if (!entry || entry.frame_type !== 'model') {
		throw new Error(`fixture has no model frame named "${partName}"`)
	}
	return Struct.fromJson((entry.frame as { model: Record<string, unknown> }).model as never)
}

const part = (name: string, kinematics: Struct): robotApi.FrameSystemConfig =>
	new robotApi.FrameSystemConfig({
		frame: new Transform({
			referenceFrame: name,
			poseInObserverFrame: new PoseInFrame({
				referenceFrame: 'world',
				pose: { x: 0, y: 0, z: 0, oX: 0, oY: 0, oZ: 1, theta: 0 },
			}),
		}),
		kinematics,
	})

const ARM = part('left-arm', kinematicsFromDump('left-arm'))

/** Joints and a link, no shapes: plenty of descriptors and nothing a ghost could be made of. */
const SHAPELESS = part(
	'left-arm',
	Struct.fromJson({
		name: 'shapeless',
		links: [
			{ id: 'base', parent: 'world' },
			{ id: 'tip', parent: 'waist' },
		],
		joints: [{ id: 'waist', type: 'revolute', parent: 'base', axis: { X: 0, Y: 0, Z: 1 } }],
	} as never)
)

/** Two distinct configurations, so it never reads as "already at the goal". */
const PLAN_REPLY: JsonValue = {
	plan: [{ 'left-arm': [0, 0, 0, 0, 0, 0] }, { 'left-arm': [1, 0, 0, 0, 0, 0] }],
}

let harness: PreviewMoveHarness | undefined

const setup = (parts = [ARM]) => {
	harness = createPreviewMoveHarness(parts)
	return harness
}

// `destroy` rather than `dispose`: koota hands out 16 world ids and only `destroy` returns one, so
// a spec that merely unmounts starves whatever runs after it in the same browser context.
afterEach(() => {
	harness?.destroy()
	harness = undefined
})

const ghostCount = (h: PreviewMoveHarness) => h.world.query(PreviewOf).length

describe('a preview that resolves', () => {
	it('draws the plan and arms the panel', async () => {
		const h = setup()

		const done = h.preview.requestPreview()
		expect(h.preview.status).toBe('planning')

		h.pending[0]!.resolve(PLAN_REPLY)
		await done

		expect(h.preview.status).toBe('ready')
		expect(h.preview.plannedSteps).toBe(2)
		expect(ghostCount(h)).toBeGreaterThan(0)
	})

	// The map the hook holds is the only handle its teardown has, so what spawn filled and what
	// clear empties have to be the same one.
	it('drops every ghost it drew when the preview is cleared', async () => {
		const h = setup()
		const done = h.preview.requestPreview()
		h.pending[0]!.resolve(PLAN_REPLY)
		await done

		h.preview.clear()

		expect(ghostCount(h)).toBe(0)
		expect(h.preview.status).toBe('idle')
	})
})

/**
 * Scrubbing has to move something. Gutting `applyPreviewStep` to a no-op also passed the whole
 * suite: the ghosts spawn, the scrubber counts, and every assertion about either still holds while
 * the scene sits perfectly still.
 */
describe('scrubbing the preview', () => {
	it('moves the ghosts it drew', async () => {
		const h = setup()
		const done = h.preview.requestPreview()
		h.pending[0]!.resolve(PLAN_REPLY)
		await done

		const before = h.world
			.query(PreviewOf, traits.WorldMatrix)
			.map((entity) => entity.get(traits.WorldMatrix)!.toArray())

		h.preview.player.seek(h.preview.player.lastStep)
		h.flush()

		const after = h.world
			.query(PreviewOf, traits.WorldMatrix)
			.map((entity) => entity.get(traits.WorldMatrix)!.toArray())

		expect(after).not.toEqual(before)
	})
})

/**
 * A plan describes one goal. The reply can land after the user has moved on, and everything the
 * resume writes — ghosts, trajectory, `status: 'ready'` — is what the panel arms `Execute preview`
 * from. `clear()` cannot reach into an awaited promise, and it leaves `status` at `idle`, so the
 * panel would go from reporting nothing pending to offering to run a plan for the abandoned goal.
 */
describe('a preview whose goal moved while it was in flight', () => {
	it('discards the answer instead of arming the panel with it', async () => {
		const h = setup()

		const done = h.preview.requestPreview()
		h.invalidate()
		expect(h.preview.status).toBe('idle')

		h.pending[0]!.resolve(PLAN_REPLY)
		await done

		expect(h.preview.status).toBe('idle')
		expect(h.preview.trajectory).toEqual([])
		expect(ghostCount(h)).toBe(0)
	})

	// Cancelled rather than merely ignored: the machine is planning, and nobody is waiting.
	it('cancels the request rather than letting it run to completion', () => {
		const h = setup()

		void h.preview.requestPreview()
		expect(h.pending[0]!.signal?.aborted).toBe(false)

		h.invalidate()

		expect(h.pending[0]!.signal?.aborted).toBe(true)
	})

	it('keeps a discarded request’s failure off the panel', async () => {
		const h = setup()

		const done = h.preview.requestPreview()
		h.invalidate()
		h.pending[0]!.reject(new Error('planning failed'))
		await done

		expect(h.preview.status).toBe('idle')
		expect(h.preview.message).toBeUndefined()
	})
})

/**
 * The world outlives the panel, and a ghost carries no `Name` by design — so anything spawned after
 * teardown is unreachable by every sweep in the codebase, and only a page reload clears it. One
 * click reaches this: leaving move mode, or deselecting the frame.
 */
describe('a preview whose panel closed while it was in flight', () => {
	it('leaves nothing behind in the world', async () => {
		const h = setup()

		const done = h.preview.requestPreview()
		h.dispose()
		h.pending[0]!.resolve(PLAN_REPLY)
		await done

		expect(ghostCount(h)).toBe(0)
	})

	/**
	 * The commoner half, and the one the in-flight case cannot reach: by the time the panel closes
	 * the ghosts are already drawn, so teardown has something to actually clear. Skipping the clear
	 * leaks a dozen entities that carry no `Name` and no `ChildOf`, which is to say nothing in the
	 * codebase can find them again.
	 */
	it('clears ghosts it had already drawn', async () => {
		const h = setup()
		const done = h.preview.requestPreview()
		h.pending[0]!.resolve(PLAN_REPLY)
		await done
		expect(ghostCount(h)).toBeGreaterThan(0)

		h.dispose()

		expect(ghostCount(h)).toBe(0)
	})
})

/**
 * Descriptors are not ghosts. Joints and geometry-less mounts make up most of them, so a frame
 * system whose shapes all failed to decode still produces plenty — and reporting `ready` on that
 * gives a working scrubber, a frame count and an armed `Execute preview` over an empty scene.
 */
describe('a frame system with nothing to draw', () => {
	it('says so rather than reporting a ready preview', async () => {
		const h = setup([SHAPELESS])

		const done = h.preview.requestPreview()
		h.pending[0]!.resolve(PLAN_REPLY)
		await done

		expect(h.preview.status).toBe('error')
		expect(h.preview.message).toMatch(/geometry/i)
		expect(ghostCount(h)).toBe(0)
	})

	// A different failure with a different cause, so it must not borrow the other's message: no
	// kinematics at all is build mode or a disconnect, not shapes that failed to decode.
	it('distinguishes no frame system from no geometry in one', async () => {
		const h = setup([])

		const done = h.preview.requestPreview()
		h.pending[0]!.resolve(PLAN_REPLY)
		await done

		expect(h.preview.status).toBe('error')
		expect(h.preview.message).toMatch(/frame system/i)
	})
})

/**
 * RDK answered, and its answer was "there is nothing to do" — the trajectory is the start
 * configuration written twice. Routing that through the error path put a live-region alert in danger
 * red on a correct result, and left no way to tell it from a plan that actually failed.
 */
describe('a goal the machine is already at', () => {
	const AT_GOAL: JsonValue = {
		plan: [{ 'left-arm': [1, 0, 0, 0, 0, 0] }, { 'left-arm': [1, 0, 0, 0, 0, 0] }],
	}

	it('reports it as its own outcome rather than as a failure', async () => {
		const h = setup()

		const done = h.preview.requestPreview()
		h.pending[0]!.resolve(AT_GOAL)
		await done

		expect(h.preview.status).toBe('already-at-goal')
		expect(h.preview.message).toMatch(/already at the target/i)
	})

	it('draws nothing and arms nothing', async () => {
		const h = setup()

		const done = h.preview.requestPreview()
		h.pending[0]!.resolve(AT_GOAL)
		await done

		expect(ghostCount(h)).toBe(0)
		expect(h.preview.trajectory).toEqual([])
	})
})

/**
 * The ghosts have to be standing at the first configuration the moment the plan lands, not at the
 * identity they spawn with — otherwise the whole set sits stacked at the world origin until the user
 * happens to scrub, and the panel reports `ready` over it.
 */
describe('where the ghosts stand before anything is scrubbed', () => {
	const poses = (h: PreviewMoveHarness) =>
		h.world
			.query(PreviewOf, traits.WorldMatrix)
			.map((entity) => entity.get(traits.WorldMatrix)!.toArray())

	it('places them at step 0 rather than leaving them at the origin', async () => {
		const h = setup()
		const done = h.preview.requestPreview()
		h.pending[0]!.resolve(PLAN_REPLY)
		await done

		const identity = new Matrix4().toArray()
		expect(poses(h).some((matrix) => !matrix.every((v, i) => v === identity[i]))).toBe(true)
	})

	// Also pins the direction of the index: playing the plan backwards would land somewhere else.
	it('returns to exactly those poses when scrubbed back to the start', async () => {
		const h = setup()
		const done = h.preview.requestPreview()
		h.pending[0]!.resolve(PLAN_REPLY)
		await done
		const atStart = poses(h)

		h.preview.player.seek(h.preview.player.lastStep)
		h.flush()
		h.preview.player.seek(0)
		h.flush()

		expect(poses(h)).toEqual(atStart)
	})
})

/**
 * One frame per planned waypoint, so the scrubber walks exactly what the planner returned. The two
 * arrays hold the same steps at this point, which is why nothing here can tell them apart — the test
 * that does arrives with the second detail mode.
 */
describe('what the scrubber walks', () => {
	it('plays one frame per configuration the planner returned', async () => {
		const h = setup()
		const done = h.preview.requestPreview()
		h.pending[0]!.resolve(PLAN_REPLY)
		await done

		expect(h.preview.player.totalSteps).toBe(2)
		expect(h.preview.plannedSteps).toBe(2)
		expect(h.preview.trajectory).toEqual(PLAN_REPLY.plan)
	})
})

/**
 * `useFrames` refetches on every config revision, so the frame system really can be replaced while a
 * plan is in flight. The kinematics the ghosts are drawn through must be the ones the plan was
 * computed against; reading them after the await drew the whole chain against a model the plan knew
 * nothing about.
 */
describe('a frame system that changes while the plan is in flight', () => {
	it('draws the plan through the kinematics it was requested with', async () => {
		const h = setup()

		const done = h.preview.requestPreview()
		h.setParts([])
		h.pending[0]!.resolve(PLAN_REPLY)
		await done

		expect(h.preview.status).toBe('ready')
		expect(ghostCount(h)).toBeGreaterThan(0)
	})
})

/**
 * What the panel sends is the whole point of the preview: it has to pose the same problem the move
 * would. `planDoCommand.spec.ts` covers the builder; this covers the wiring into it.
 */
describe('the request the panel sends', () => {
	it('names the frame it is open on and the service it selected', () => {
		const h = setup()

		void h.preview.requestPreview()

		const request = JSON.parse(h.pending[0]!.command.plan as string) as Record<string, unknown>
		expect(request.componentName).toBe('left-arm')
		expect(request.name).toBe('builtin')
	})
})
