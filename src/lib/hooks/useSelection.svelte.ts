import { useThrelte } from '@threlte/core'
import { getContext, setContext } from 'svelte'
import type { Object3D } from 'three'
import { useObjects } from './useObjects.svelte'
import type { WorldObject } from '$lib/WorldObject'

const hoverKey = Symbol('hover-context')
const selectionKey = Symbol('selection-context')
const focusKey = Symbol('focus-context')
const selectedObjectKey = Symbol('selected-frame-context')
const focusedObjectKey = Symbol('focused-frame-context')

type UUID = string

interface SelectionContext {
	readonly current: UUID | undefined
	set(value?: UUID): void
}

interface FocusContext {
	readonly current: UUID | undefined
	set(value?: UUID): void
}

interface HoverContext {
	readonly current: UUID | undefined
	set(value?: UUID): void
}

interface SelectedWorldObjectContext {
	readonly current: WorldObject | undefined
}

interface FocusedWorldObjectContext {
	readonly current: WorldObject | undefined
}

export const provideSelection = () => {
	let selected = $state<UUID>()
	let focused = $state<UUID>()
	let hovered = $state<UUID>()

	const selectionContext = {
		get current() {
			return selected
		},
		set(value?: UUID) {
			selected = value
		},
	}
	setContext<SelectionContext>(selectionKey, selectionContext)

	const focusContext = {
		get current() {
			return focused
		},
		set(value?: UUID) {
			focused = value
		},
	}
	setContext<FocusContext>(focusKey, focusContext)

	const hoverContext = {
		get current() {
			return hovered
		},
		set(value?: UUID) {
			hovered = value
		},
	}
	setContext<HoverContext>(hoverKey, hoverContext)

	const objects = useObjects()
	const selectedObject = $derived(objects.current.find((object) => object.uuid === selected))

	const selectedObjectContext = {
		get current() {
			return selectedObject
		},
	}
	setContext<SelectedWorldObjectContext>(selectedObjectKey, selectedObjectContext)

	const focusedFrame = $derived(objects.current.find((object) => object.uuid === focused))

	const focusedFrameContext = {
		get current() {
			return focusedFrame
		},
	}
	setContext<FocusedWorldObjectContext>(focusedObjectKey, focusedFrameContext)

	return {
		selection: selectionContext,
		focus: focusContext,
		hover: hoverContext,
	}
}

export const useSelected = () => {
	return getContext<SelectionContext>(selectionKey)
}

export const useFocused = () => {
	return getContext<FocusContext>(focusKey)
}

export const useFocusedObject = (): { current: WorldObject | undefined } => {
	return getContext<FocusedWorldObjectContext>(focusedObjectKey)
}

export const useSelectedObject = (): { current: WorldObject | undefined } => {
	return getContext<SelectedWorldObjectContext>(selectedObjectKey)
}

export const useFocusedObject3d = (): { current: Object3D | undefined } => {
	const focusedObject = useFocusedObject()
	const { scene } = useThrelte()
	const object = $derived(
		focusedObject.current
			? scene.getObjectByProperty('uuid', focusedObject.current.uuid)?.clone()
			: undefined
	)

	return {
		get current() {
			return object
		},
	}
}

export const useSelectedObject3d = (): { current: Object3D | undefined } => {
	const selectedObject = useSelectedObject()
	const { scene } = useThrelte()
	const object = $derived(
		selectedObject.current
			? scene.getObjectByProperty('uuid', selectedObject.current.uuid)
			: undefined
	)

	return {
		get current() {
			return object
		},
	}
}
