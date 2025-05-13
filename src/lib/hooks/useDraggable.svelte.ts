import { PersistedState } from 'runed'
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

export const useDraggable = (name: string) => {
	const down = { x: 0, y: 0 }
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
		get translate() {
			return translate.current
		},
	})
}
