import { type Entity } from 'koota'
import { onDestroy } from 'svelte'

import { traits, useWorld } from '$lib/ecs'

import { clearSelection } from './selection'
import { cancelPending } from './spawn'
import { useAddNextInput, useCancelInput, useConfirmInput, useUndoInput } from './useInputs.svelte'

interface Options {
	onConfirm?: () => void
	onCancel?: () => void
	onAddNext?: () => void
	onUndo?: () => void
}

export const usePending = (options: () => Options = () => ({})) => {
	const world = useWorld()

	let pending = $state.raw<Entity>()

	useConfirmInput(() => options().onConfirm?.())
	useCancelInput(() => options().onCancel?.())
	useAddNextInput(() => options().onAddNext?.())
	useUndoInput(() => options().onUndo?.())

	onDestroy(() => {
		if (pending !== undefined && pending.has(traits.Selected)) clearSelection(world)
		cancelPending(pending)
	})

	return {
		get current() {
			return pending
		},

		set: (entity: Entity | undefined) => {
			pending = entity
		},
	}
}
