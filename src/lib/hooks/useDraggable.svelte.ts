import { PersistedState } from 'runed'
import { setContext } from 'svelte'

const key = Symbol('draggables-context')

interface Context {
	onDragStart: (event: MouseEvent) => void
	onDragMove: (event: MouseEvent) => void
	onDragEnd: (event: MouseEvent) => void
	current: {
		x: number
		y: number
	}
}

export const provideDraggables = () => {}

export const useDraggable = (name: string) => {
	const down = { x: 0, y: 0 }

	const onDragMove = () => {}

	const onDragStart = (event: MouseEvent) => {
		down.x = event.clientX
		down.y = event.clientY
	}

	const onDragEnd = (event: MouseEvent) => {
		translate.current.x += event.clientX - down.x
		translate.current.y += event.clientY - down.y
	}

	const translate = new PersistedState(`${name} draggable`, { x: 0, y: 0 })

	setContext<Context>(key, {
		onDragStart,
		onDragMove,
		onDragEnd,
		get current() {
			return translate.current
		},
	})
}
