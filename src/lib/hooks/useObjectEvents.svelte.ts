import { useCursor, type IntersectionEvent } from '@threlte/extras'
import { useFocused, useSelected } from './useSelection.svelte'
import { useVisibility } from './useVisibility.svelte'

export const useObjectEvents = (uuid: () => string) => {
	const { onPointerEnter, onPointerLeave } = useCursor()
	const selected = useSelected()
	const focused = useFocused()
	const visibility = useVisibility()

	return {
		get visible() {
			return visibility.get(uuid())
		},
		onpointerenter: (event: IntersectionEvent<MouseEvent>) => {
			event.stopPropagation()
			onPointerEnter()
		},
		onpointerleave: (event: IntersectionEvent<MouseEvent>) => {
			event.stopPropagation()
			onPointerLeave()
		},
		ondblclick: (event: IntersectionEvent<MouseEvent>) => {
			event.stopPropagation()
			focused.set(uuid())
		},
		onclick: (event: IntersectionEvent<MouseEvent>) => {
			event.stopPropagation()
			selected.set(uuid())
		},
		onpointermissed: () => selected.set(),
	}
}
