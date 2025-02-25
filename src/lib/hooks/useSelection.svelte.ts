import { getContext, setContext } from 'svelte'
import type { Mesh, Points } from 'three'

const hoverKey = Symbol('hover-context')
const selectionKey = Symbol('selection-context')
const focusKey = Symbol('focus-context')

type Selection = Mesh | Points | undefined

interface SelectionContext {
	readonly current: Selection
	set(value: Selection): void
}

interface FocusContext {
	readonly current: Selection
	set(value: Selection): void
}

interface HoverContext {
	readonly current: Selection
	set(value: Selection): void
}

export const provideSelection = () => {
	let selection = $state.raw<Selection>()
	let focus = $state.raw<Selection>()
	let hovering = $state.raw<Selection>()

	setContext<SelectionContext>(selectionKey, {
		get current() {
			return selection
		},
		set(value: Selection) {
			selection = value
		},
	})

	setContext<FocusContext>(focusKey, {
		get current() {
			return focus
		},
		set(value: Selection) {
			focus = value
		},
	})

	setContext<HoverContext>(hoverKey, {
		get current() {
			return hovering
		},
		set(value: Selection) {
			hovering = value?.clone()
		},
	})
}

export const useSelection = () => {
	return getContext<SelectionContext>(selectionKey)
}

export const useFocus = () => {
	return getContext<FocusContext>(focusKey)
}
