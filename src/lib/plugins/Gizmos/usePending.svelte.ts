import { type Entity } from 'koota'
import { onDestroy } from 'svelte'

import { useSelectedEntity } from '$lib/hooks/useSelection.svelte'

import { cancelPending } from './spawn'
import {
	useAddNextGesture,
	useCancelGesture,
	useConfirmGesture,
	useUndoGesture,
} from './useGestures.svelte'

interface Options {
	onConfirm?: () => void
	onCancel?: () => void
	onAddNext?: () => void
	onUndo?: () => void
}

export const usePending = (options: () => Options = () => ({})) => {
	const selectedEntity = useSelectedEntity()

	let pending = $state.raw<Entity>()

	useConfirmGesture(() => options().onConfirm?.())
	useCancelGesture(() => options().onCancel?.())
	useAddNextGesture(() => options().onAddNext?.())
	useUndoGesture(() => options().onUndo?.())

	onDestroy(() => {
		if (pending !== undefined && selectedEntity.current === pending) selectedEntity.set()
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
