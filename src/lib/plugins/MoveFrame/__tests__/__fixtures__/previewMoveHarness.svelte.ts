/**
 * `usePreviewMove` owns `$state` and two `$effect`s, and runes only compile in a `.svelte.ts` file,
 * so the reactive scaffolding lives here and the assertions stay in the spec.
 */

import type { JsonValue } from '@bufbuild/protobuf'
import type { MotionClient } from '@viamrobotics/sdk'

import { flushSync } from 'svelte'

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
	/** Every `doCommand` still awaiting an answer, oldest first. */
	pending: PendingCommand[]
	/**
	 * Re-key the invalidation input, standing in for anything the panel names there: dragging the
	 * gizmo to a new goal, editing the world state, switching motion service.
	 */
	invalidate: () => void
	flush: () => void
	/** Unmount, the way closing the move panel or leaving move mode does. Safe to call twice. */
	dispose: () => void
}

export const createPreviewMoveHarness = (
	options: { moveOptions?: () => MoveOptions } = {}
): PreviewMoveHarness => {
	const pending: PendingCommand[] = []

	let key = $state(0)

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

	let preview!: PreviewMove
	const stopRoot = $effect.root(() => {
		preview = usePreviewMove({
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
		pending,
		invalidate: () => {
			key += 1
			flushSync()
		},
		flush: flushSync,
		dispose,
	}
}
