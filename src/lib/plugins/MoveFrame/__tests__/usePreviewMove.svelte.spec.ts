import type { JsonValue } from '@bufbuild/protobuf'

import { afterEach, describe, expect, it } from 'vitest'

import { parseMoveOptions } from '../parseMoveOptions'
import {
	createPreviewMoveHarness,
	type PreviewMoveHarness,
} from './__fixtures__/previewMoveHarness.svelte'

/** Two distinct configurations, so it never reads as "already at the goal". */
const PLAN_REPLY: JsonValue = {
	plan: [{ 'left-arm': [0, 0, 0, 0, 0, 0] }, { 'left-arm': [1, 0, 0, 0, 0, 0] }],
}

let harness: PreviewMoveHarness | undefined

const setup = () => {
	harness = createPreviewMoveHarness()
	return harness
}

afterEach(() => {
	harness?.dispose()
	harness = undefined
})

describe('a preview that resolves', () => {
	it('arms the panel with the trajectory the planner returned', async () => {
		const previewHarness = setup()

		const done = previewHarness.preview.requestPreview()
		previewHarness.pending[0]!.resolve(PLAN_REPLY)
		await done

		expect(previewHarness.preview.status).toBe('ready')
		expect(previewHarness.preview.trajectory).toEqual([
			{ 'left-arm': [0, 0, 0, 0, 0, 0] },
			{ 'left-arm': [1, 0, 0, 0, 0, 0] },
		])
		expect(previewHarness.preview.plannedSteps).toBe(2)
	})

	it('reports planning while the request is open', () => {
		const previewHarness = setup()

		void previewHarness.preview.requestPreview()

		expect(previewHarness.preview.status).toBe('planning')
	})
})

describe('a preview the motion service refuses', () => {
	it('reports the reason the service gave', async () => {
		const previewHarness = setup()

		const done = previewHarness.preview.requestPreview()
		previewHarness.pending[0]!.reject(new Error('no plan found within the constraints'))
		await done

		expect(previewHarness.preview.status).toBe('error')
		expect(previewHarness.preview.message).toBe('no plan found within the constraints')
	})

	it('names the frame when the failure carries no message', async () => {
		const previewHarness = setup()

		const done = previewHarness.preview.requestPreview()
		previewHarness.pending[0]!.reject('not an Error')
		await done

		expect(previewHarness.preview.message).toBe('Failed to plan a move for "left-arm".')
	})

	it('reports an unreadable reply rather than arming an empty preview', async () => {
		const previewHarness = setup()

		const done = previewHarness.preview.requestPreview()
		previewHarness.pending[0]!.resolve({ plan: [] })
		await done

		expect(previewHarness.preview.status).toBe('error')
		expect(previewHarness.preview.trajectory).toEqual([])
	})
})

describe('a preview whose goal moved while it was in flight', () => {
	it('discards the answer instead of arming the panel with it', async () => {
		const previewHarness = setup()

		const done = previewHarness.preview.requestPreview()
		previewHarness.invalidate()
		expect(previewHarness.preview.status).toBe('idle')

		previewHarness.pending[0]!.resolve(PLAN_REPLY)
		await done

		expect(previewHarness.preview.status).toBe('idle')
		expect(previewHarness.preview.trajectory).toEqual([])
	})

	it('cancels the request rather than letting it run to completion', () => {
		const previewHarness = setup()

		void previewHarness.preview.requestPreview()
		expect(previewHarness.pending[0]!.signal?.aborted).toBe(false)

		previewHarness.invalidate()

		expect(previewHarness.pending[0]!.signal?.aborted).toBe(true)
	})

	it('keeps a discarded request’s failure off the panel', async () => {
		const previewHarness = setup()

		const done = previewHarness.preview.requestPreview()
		previewHarness.invalidate()
		previewHarness.pending[0]!.reject(new Error('planning failed'))
		await done

		expect(previewHarness.preview.status).toBe('idle')
		expect(previewHarness.preview.message).toBeUndefined()
	})
})

describe('a preview whose panel closed while it was in flight', () => {
	it('cancels the request rather than letting it run to completion', () => {
		const previewHarness = setup()

		void previewHarness.preview.requestPreview()

		previewHarness.dispose()

		expect(previewHarness.pending[0]!.signal?.aborted).toBe(true)
	})
})

describe('a goal the machine is already at', () => {
	/** RDK's answer for "nothing to do": the start configuration written twice. */
	const AT_GOAL: JsonValue = {
		plan: [{ 'left-arm': [1, 0, 0, 0, 0, 0] }, { 'left-arm': [1, 0, 0, 0, 0, 0] }],
	}

	it('reports it as its own outcome rather than as a failure', async () => {
		const previewHarness = setup()

		const done = previewHarness.preview.requestPreview()
		previewHarness.pending[0]!.resolve(AT_GOAL)
		await done

		expect(previewHarness.preview.status).toBe('already-at-goal')
		expect(previewHarness.preview.message).toMatch(/already at the target/i)
	})

	it('arms nothing', async () => {
		const previewHarness = setup()

		const done = previewHarness.preview.requestPreview()
		previewHarness.pending[0]!.resolve(AT_GOAL)
		await done

		expect(previewHarness.preview.trajectory).toEqual([])
		expect(previewHarness.preview.plannedSteps).toBe(0)
	})
})

describe('the request the panel sends', () => {
	it('names the frame it is open on and the service it selected', () => {
		const previewHarness = setup()

		void previewHarness.preview.requestPreview()

		const request = JSON.parse(previewHarness.pending[0]!.command.plan as string) as Record<
			string,
			unknown
		>
		expect(request.componentName).toBe('left-arm')
		expect(request.name).toBe('builtin')
	})

	/**
	 * The only case that builds its own `moveOptions`: on the harness default of two `undefined`s,
	 * forwarded and silently dropped look identical, so no other test here can tell them apart.
	 */
	it('passes through the world state and constraints the panel parsed', () => {
		harness = createPreviewMoveHarness({
			moveOptions: () =>
				parseMoveOptions(
					'{"obstacles":[{"referenceFrame":"world","geometries":[{"sphere":{"radiusMm":50}}]}]}',
					'{"linearConstraint":[{"lineToleranceMm":5}]}'
				),
		})
		const previewHarness = harness

		void previewHarness.preview.requestPreview()

		const request = JSON.parse(previewHarness.pending[0]!.command.plan as string) as Record<
			string,
			unknown
		>
		expect(request.worldState).toEqual({
			obstacles: [{ referenceFrame: 'world', geometries: [{ sphere: { radiusMm: 50 } }] }],
		})
		expect(request.constraints).toEqual({ linearConstraint: [{ lineToleranceMm: 5 }] })
	})
})
