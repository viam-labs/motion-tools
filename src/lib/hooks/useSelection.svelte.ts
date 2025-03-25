import { useThrelte } from '@threlte/core'
import { getContext, setContext } from 'svelte'
import type { Mesh, Object3D, Points } from 'three'
import { useAllFrames } from './useFrames.svelte'
import type { Frame } from './useFrames.svelte'

const hoverKey = Symbol('hover-context')
const selectionKey = Symbol('selection-context')
const focusKey = Symbol('focus-context')
const selectedFrameKey = Symbol('selected-frame-context')
const focusedFrameKey = Symbol('focused-frame-context')

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

interface SelectedFrameContext {
	readonly current: Frame | undefined
}

interface FocusedFrameContext {
	readonly current: Frame | undefined
}

export const provideSelection = () => {
	let selection = $state.raw<Selection>()
	let focus = $state.raw<Selection>()
	let hovering = $state.raw<Selection>()

	const selectionContext = {
		get current() {
			return selection
		},
		set(value: Selection) {
			selection = value
		},
	}
	setContext<SelectionContext>(selectionKey, selectionContext)

	const focusContext = {
		get current() {
			return focus
		},
		set(value: Selection) {
			focus = value
		},
	}
	setContext<FocusContext>(focusKey, focusContext)

	const hoverContext = {
		get current() {
			return hovering
		},
		set(value: Selection) {
			hovering = value
		},
	}
	setContext<HoverContext>(hoverKey, hoverContext)

	const allFrames = useAllFrames()
	const selectedFrame = $derived(allFrames.current.find((frame) => frame.name === selection))

	const selectedFrameContext = {
		get current() {
			return selectedFrame
		},
	}
	setContext<SelectedFrameContext>(selectedFrameKey, selectedFrameContext)

	const focusedFrame = $derived(allFrames.current.find((frame) => frame.name === focus))

	const focusedFrameContext = {
		get current() {
			return focusedFrame
		},
	}
	setContext<FocusedFrameContext>(focusedFrameKey, focusedFrameContext)

	return { selection: selectionContext, focus: focusContext, hover: hoverContext }
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

export const useSelectionObject = (): { current: Object3D | undefined } => {
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

export const useFocusedFrame = (): { current: Frame | undefined } => {
	return getContext<FocusedFrameContext>(focusedFrameKey)
}

export const useSelectedFrame = (): { current: Frame | undefined } => {
	return getContext<SelectedFrameContext>(selectedFrameKey)
}
