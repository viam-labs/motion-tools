import { useThrelte } from '@threlte/core'
import { getContext, setContext } from 'svelte'
import type { Mesh, Points } from 'three'
import { usePointClouds } from './usePointclouds.svelte'
import { useGeometries } from './useGeometries.svelte'
import { useFrames } from './useFrames.svelte'
import { useStaticGeometries } from './useStaticGeometries.svelte'

const hoverKey = Symbol('hover-context')
const selectionKey = Symbol('selection-context')
const focusKey = Symbol('focus-context')

type Selection = string | undefined

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
			hovering = value
		},
	})
}

export const useSelection = () => {
	return getContext<SelectionContext>(selectionKey)
}

export const useFocus = () => {
	return getContext<FocusContext>(focusKey)
}

export const useFocusedObject = () => {
	const focus = useFocus()
	const { scene } = useThrelte()
	const object = $derived(
		focus.current ? (scene.getObjectByName(focus.current) as Mesh | Points).clone() : undefined
	)

	return {
		get current() {
			return object
		},
	}
}

export const useFocusedFrame = () => {
	const geometries = useGeometries()
	const frames = useFrames()
	const statics = useStaticGeometries()
	const focus = useFocus()

	const allFrames = $derived([...geometries.current, ...frames.current, ...statics.current])
	const selected = $derived(allFrames.find((frame) => frame.name === focus.current))

	return {
		get current() {
			return selected
		},
	}
}

export const useSelectionObject = () => {
	const selection = useSelection()
	const { scene } = useThrelte()
	const object = $derived(
		selection.current ? (scene.getObjectByName(selection.current) as Mesh | Points) : undefined
	)

	return {
		get current() {
			return object
		},
	}
}

export const useSelectedFrame = () => {
	const geometries = useGeometries()
	const frames = useFrames()
	const statics = useStaticGeometries()
	const selection = useSelection()

	const allFrames = $derived([...geometries.current, ...frames.current, ...statics.current])
	const selected = $derived(allFrames.find((frame) => frame.name === selection.current))

	return {
		get current() {
			return selected
		},
	}
}
