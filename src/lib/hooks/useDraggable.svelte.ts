import { setContext } from 'svelte'

const key = Symbol('draggables-context')

interface Context {
	onDragStart: () => void
	onDragMove: () => void
	onDragEnd: () => void
	translate: {
		current: {
			x: number
			y: number
		}
	}
}

export const provideDraggables = () => {}

export const useDraggable = () => {
	const onDragStart = () => {}

	const onDragEnd = () => {}

	setContext<Context>(key, {
		onDragStart,
		onDragMove,
	})
}
