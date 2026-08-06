import type { JsonValue } from '@bufbuild/protobuf'

import { Struct } from '@bufbuild/protobuf'
import { PoseInFrame, robotApi, Transform } from '@viamrobotics/sdk'
import { Matrix4 } from 'three'
import { afterEach, describe, expect, it } from 'vitest'

import { traits } from '$lib/ecs'
import { parsePlan } from '$lib/plugins/MotionPlanReplayer/parse-plan'

import planJson from '../../MotionPlanReplayer/__tests__/__fixtures__/plan.json?raw'
import { parseMoveOptions } from '../parseMoveOptions'
import { PreviewOf } from '../traits'
import {
	createPreviewMoveHarness,
	type PreviewMoveHarness,
} from './__fixtures__/previewMoveHarness.svelte'

const dump = parsePlan(planJson)

/** A part's `kinematics` is the same `ModelConfigJSON` a dump nests under `frame.model`. */
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

/** The only assertion in this file that fails when `applyPreviewStep` is gutted to a no-op. */
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
 * The world outlives the panel, and a ghost carries no `Name`, so anything left behind is
 * unreachable by every sweep in the codebase and only a page reload clears it.
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

	/** Not a duplicate of the case above: here teardown has ghosts to actually clear. */
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

describe('a frame system with nothing to draw', () => {
	// The two messages must stay distinguishable, so each pattern has to reject the other's message.
	it.each([
		{ cause: 'shapes it could not decode', parts: [SHAPELESS], message: /no geometry/i },
		{ cause: 'no frame system at all', parts: [], message: /no frame system/i },
	])('reports $cause rather than a ready preview', async ({ parts, message }) => {
		const h = setup(parts)

		const done = h.preview.requestPreview()
		h.pending[0]!.resolve(PLAN_REPLY)
		await done

		expect(h.preview.status).toBe('error')
		expect(h.preview.message).toMatch(message)
		expect(ghostCount(h)).toBe(0)
	})
})

describe('a goal the machine is already at', () => {
	/** RDK's answer for "nothing to do": the start configuration written twice. */
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
		expect(atStart.length).toBeGreaterThan(0)

		h.preview.player.seek(h.preview.player.lastStep)
		h.flush()
		h.preview.player.seek(0)
		h.flush()

		expect(poses(h)).toEqual(atStart)
	})
})

/**
 * The hook keeps two arrays and they answer different questions. `trajectory` is what the planner
 * said and the only thing `execute` may be handed; `playbackFrames` is that same motion subdivided
 * for the scrubber, which the robot must never be asked to run.
 *
 * Nothing had ever told them apart: returning the playback frames from `get trajectory()` — handing
 * the robot the interpolated ones — passed the whole suite. Subdividing is what makes the two
 * observably different, so this is the first PR in which the distinction can be pinned at all.
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

	it('keeps handing out the waypoints when playback is subdivided', async () => {
		const h = setup()
		const done = h.preview.requestPreview()
		h.pending[0]!.resolve(PLAN_REPLY)
		await done

		h.preview.detail = 'interpolated'
		h.flush()

		expect(h.preview.player.totalSteps).toBeGreaterThan(2)
		expect(h.preview.trajectory).toEqual(PLAN_REPLY.plan)
		expect(h.preview.plannedSteps).toBe(2)
	})
})

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

/** `planDoCommand.spec.ts` covers the builder; this covers the wiring into it. */
describe('the request the panel sends', () => {
	it('names the frame it is open on and the service it selected', () => {
		const h = setup()

		void h.preview.requestPreview()

		const request = JSON.parse(h.pending[0]!.command.plan as string) as Record<string, unknown>
		expect(request.componentName).toBe('left-arm')
		expect(request.name).toBe('builtin')
	})

	/**
	 * The only case that builds its own `moveOptions`: on the harness default of two `undefined`s,
	 * forwarded and silently dropped look identical, so no other test here can tell them apart.
	 */
	it('passes through the world state and constraints the panel parsed', () => {
		harness = createPreviewMoveHarness([ARM], {
			moveOptions: () =>
				parseMoveOptions(
					'{"obstacles":[{"referenceFrame":"world","geometries":[{"sphere":{"radiusMm":50}}]}]}',
					'{"linearConstraint":[{"lineToleranceMm":5}]}'
				),
		})
		const h = harness

		void h.preview.requestPreview()

		const request = JSON.parse(h.pending[0]!.command.plan as string) as Record<string, unknown>
		expect(request.worldState).toEqual({
			obstacles: [{ referenceFrame: 'world', geometries: [{ sphere: { radiusMm: 50 } }] }],
		})
		expect(request.constraints).toEqual({ linearConstraint: [{ lineToleranceMm: 5 }] })
	})
})

/**
 * `waypointIndices` is what the scrubber draws its tick marks from, and it is the only thing telling
 * a user which of 180 interpolated frames the planner actually chose.
 */
describe('marking which played frames are planned waypoints', () => {
	it('marks every frame when each one is a waypoint', async () => {
		const h = setup()
		const done = h.preview.requestPreview()
		h.pending[0]!.resolve(PLAN_REPLY)
		await done

		expect(h.preview.waypointIndices).toEqual([0, 1])
	})

	it('marks the waypoints among the frames subdividing them', async () => {
		const h = setup()
		const done = h.preview.requestPreview()
		h.pending[0]!.resolve(PLAN_REPLY)
		await done

		h.preview.detail = 'interpolated'
		h.flush()

		expect(h.preview.waypointIndices).toHaveLength(2)
		expect(h.preview.waypointIndices[0]).toBe(0)
		expect(h.preview.waypointIndices.at(-1)).toBe(h.preview.player.lastStep)
	})
})

/**
 * The two detail settings are different framings of one motion, so a frame index does not carry
 * across. Leaving `currentStep` where it was pointed the scrubber past the end of the shorter
 * framing and left the ghosts showing a pose from the other one.
 */
describe('switching what a frame represents', () => {
	it('restarts playback rather than keeping an index that no longer means anything', async () => {
		const h = setup()
		const done = h.preview.requestPreview()
		h.pending[0]!.resolve(PLAN_REPLY)
		await done

		h.preview.player.seek(h.preview.player.lastStep)
		h.flush()
		expect(h.preview.player.currentStep).toBe(1)

		h.preview.detail = 'interpolated'
		h.flush()

		expect(h.preview.player.currentStep).toBe(0)
	})
})
