import { useCursor, type IntersectionEvent } from '@threlte/extras'
import { useFocused, useSelected } from './useSelection.svelte'
import { useVisibility } from './useVisibility.svelte'
import { Vector2 } from 'three'

export const useObjectEvents = (uuid: () => string) => {
	const { onPointerEnter, onPointerLeave } = useCursor()
	const selected = useSelected()
	const focused = useFocused()
	const visibility = useVisibility()
	const down = new Vector2()

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
		onpointerdown: (event: IntersectionEvent<MouseEvent>) => {
			down.copy(event.pointer)
		},
		onclick: (event: IntersectionEvent<MouseEvent>) => {
			event.stopPropagation()
			console.log(down.distanceToSquared(event.pointer))
			if (down.distanceToSquared(event.pointer) < 0.1) {
				selected.set(uuid())
			}
		},
		onpointermissed: () => selected.set(),
	}
}
