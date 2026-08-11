/**
 * `usePreviewMove` owns `$state` and two `$effect`s, and runes only compile in a `.svelte.ts` file,
 * so the reactive scaffolding lives here and the assertions stay in the spec.
 */

import type { JsonValue } from '@bufbuild/protobuf'
import type { MotionClient, robotApi } from '@viamrobotics/sdk'

import { createWorld, type World } from 'koota'
import { flushSync } from 'svelte'

import type { FramesContext } from '$lib/hooks/useFrames.svelte'

import { Pose } from '$lib/math'

import type { MoveOptions } from '../../parseMoveOptions'
import type { PreviewMove } from '../../usePreviewMove.svelte'

import { usePreviewMove } from '../../usePreviewMove.svelte'

/** One `doCommand` the harness is holding open, so a spec decides when — and whether — it answers. */
export interface PendingCommand {
	command: Record<string, JsonValue>
	signal: AbortSignal | undefined
	resolve: (value: JsonValue) => void
	reject: (error: unknown) => void
}

export interface PreviewMoveHarness {
	preview: PreviewMove
	world: World
	/** Every `doCommand` still awaiting an answer, oldest first. */
	pending: PendingCommand[]
	/**
	 * Re-key the invalidation input, standing in for anything the panel names there: dragging the
	 * gizmo to a new goal, editing the world state, switching motion service.
	 */
	invalidate: () => void
	flush: () => void
	/**
	 * Swap the frame system, the way a config revision does — `useFrames` refetches on every one, so
	 * this can happen while a plan is in flight.
	 */
	setParts: (next: robotApi.FrameSystemConfig[]) => void
	/** Unmount, the way closing the move panel or leaving move mode does. Safe to call twice. */
	dispose: () => void
	/**
	 * Unmount and hand the koota world id back. Koota's pool is 16 and only `destroy` returns one, so
	 * a spec that leaks them starves whatever runs later in the same browser context.
	 */
	destroy: () => void
}

export const createPreviewMoveHarness = (
	initialParts: robotApi.FrameSystemConfig[],
	options: { moveOptions?: () => MoveOptions } = {}
): PreviewMoveHarness => {
	const world = createWorld()
	const pending: PendingCommand[] = []

	let key = $state(0)
	// Raw: replaced wholesale, and the hook reads it without wanting a proxy around protobuf classes.
	let parts = $state.raw(initialParts)

	// Typed off the real method so a changed `doCommand` signature fails here rather than compiling.
	const doCommand: MotionClient['doCommand'] = (command, callOptions) =>
		new Promise<JsonValue>((resolve, reject) => {
			pending.push({
				command: command as Record<string, JsonValue>,
				signal: callOptions?.signal,
				resolve,
				reject,
			})
		})

	const client = { doCommand } as unknown as MotionClient

	// `isReady` is fixed because the preview never asks: it reads `parts`, not the world. A getter, so
	// swapping the frame system is visible to the hook the way a refetch would be.
	const frames: FramesContext = {
		current: [],
		get parts() {
			return parts
		},
		isReady: true,
		kinematicsComponents: new Set<string>(),
	}

	let preview!: PreviewMove
	const stopRoot = $effect.root(() => {
		preview = usePreviewMove({
			world,
			frames,
			client: () => client,
			service: () => 'builtin',
			frameName: () => 'left-arm',
			destination: () => ({ referenceFrame: 'world', pose: new Pose(0, 0, 100) }),
			moveOptions:
				options.moveOptions ?? (() => ({ worldState: undefined, constraints: undefined })),
			invalidateOn: () => key,
		})
	})

	flushSync()

	let disposed = false
	const dispose = () => {
		if (disposed) return
		disposed = true
		stopRoot()
	}

	return {
		preview,
		world,
		pending,
		invalidate: () => {
			key += 1
			flushSync()
		},
		setParts: (next) => {
			parts = next
			flushSync()
		},
		flush: flushSync,
		dispose,
		destroy: () => {
			dispose()
			world.destroy()
		},
	}
}
