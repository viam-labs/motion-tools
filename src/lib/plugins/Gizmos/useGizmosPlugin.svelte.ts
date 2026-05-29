import { useThrelte } from '@threlte/core'
import { getContext, setContext } from 'svelte'
import { Vector3 } from 'three'

import { traits } from '$lib/ecs'

const key = Symbol('gizmos-plugin-context')

export type GizmoMode =
	| 'idle'
	| 'coordinate-system'
	| 'plane'
	| 'geometry'
	| 'line'
	| 'arrow'
	| 'vertex-normals'
	| 'surface-normals'

export type PlaneAxis = 'yz' | 'xz' | 'xy'
export type PlanePlacement = 'free' | 'offset'

export type GeometryShape = 'box' | 'sphere' | 'capsule'
export type GeometryPlacement = 'at-origin' | 'free'

export type LineSpace = 'world' | 'screen'
export type LineMeasure = 'none' | 'segment' | 'total'

export type ArrowAxis = 'x' | 'y' | 'z' | 'surface'

const planeAxisVectors = {
	yz: new Vector3(1, 0, 0),
	xz: new Vector3(0, 1, 0),
	xy: new Vector3(0, 0, 1),
} as const

const geometryTraits = {
	box: traits.Box({ x: 200, y: 200, z: 200 }),
	sphere: traits.Sphere({ r: 100 }),
	capsule: traits.Capsule({ l: 200, r: 50 }),
} as const

export const provideGizmosPlugin = (exit: () => void) => {
	let mode = $state<GizmoMode>('idle')

	let planeAxis = $state<PlaneAxis>('xy')
	let planeConstruction = $state<PlanePlacement>('offset')
	let planeOffset = $state(0)

	let geometryShape = $state<GeometryShape>('box')
	let geometryConstruction = $state<GeometryPlacement>('at-origin')
	let isGeometryWireframe = $state(false)

	let lineSpace = $state<LineSpace>('world')
	let lineMeasure = $state<LineMeasure>('none')

	let arrowAxis = $state<ArrowAxis>('y')

	let vertexNormalsLength = $state(100)
	let surfaceNormalsLength = $state(100)

	return setContext(key, {
		get mode() {
			return mode
		},
		set mode(value) {
			mode = value
		},

		get planeAxis() {
			return planeAxis
		},
		set planeAxis(value) {
			planeAxis = value
		},

		get planeConstruction() {
			return planeConstruction
		},
		set planeConstruction(value) {
			planeConstruction = value
		},

		get planeOffset() {
			return planeOffset
		},
		set planeOffset(value) {
			planeOffset = value
		},

		get planeAxisVector() {
			return planeAxisVectors[planeAxis]
		},

		get geometryShape() {
			return geometryShape
		},
		set geometryShape(value) {
			geometryShape = value
		},

		get geometryConstruction() {
			return geometryConstruction
		},
		set geometryConstruction(value) {
			geometryConstruction = value
		},

		get geometryTrait() {
			return geometryTraits[geometryShape]
		},

		get isGeometryWireframe() {
			return isGeometryWireframe
		},
		set isGeometryWireframe(value) {
			isGeometryWireframe = value
		},

		get lineSpace() {
			return lineSpace
		},
		set lineSpace(value) {
			lineSpace = value
		},

		get lineMeasure() {
			return lineMeasure
		},
		set lineMeasure(value) {
			lineMeasure = value
		},

		get arrowAxis() {
			return arrowAxis
		},
		set arrowAxis(value) {
			arrowAxis = value
		},

		get vertexNormalsLength() {
			return vertexNormalsLength
		},
		set vertexNormalsLength(value) {
			vertexNormalsLength = value
		},

		get surfaceNormalsLength() {
			return surfaceNormalsLength
		},
		set surfaceNormalsLength(value) {
			surfaceNormalsLength = value
		},

		exit,
	})
}

export const useGizmosPlugin = () => {
	return getContext<ReturnType<typeof provideGizmosPlugin>>(key)
}

export const useCancelGesture = (handler: () => void) => {
	const { dom } = useThrelte()

	const onKey = (event: KeyboardEvent) => {
		if (event.key === 'Escape') handler()
	}

	const onContext = (event: MouseEvent) => {
		event.preventDefault()
		handler()
	}

	$effect(() => {
		window.addEventListener('keydown', onKey)
		dom.addEventListener('contextmenu', onContext)
		return () => {
			window.removeEventListener('keydown', onKey)
			dom.removeEventListener('contextmenu', onContext)
		}
	})
}

export const useConfirmGesture = (handler: () => void) => {
	const onKey = (event: KeyboardEvent) => {
		if (event.key !== 'Enter') return

		const target = event.target as HTMLElement | null
		if (isInteractive(target)) return

		handler()
	}

	$effect(() => {
		window.addEventListener('keydown', onKey)
		return () => window.removeEventListener('keydown', onKey)
	})
}

export const useUndoGesture = (handler: () => void) => {
	const onKey = (event: KeyboardEvent) => {
		if (event.key !== 'Backspace') return

		const target = event.target as HTMLElement | null
		if (isInteractive(target)) return

		handler()
	}

	$effect(() => {
		window.addEventListener('keydown', onKey)
		return () => window.removeEventListener('keydown', onKey)
	})
}

export const useAddNextGesture = (handler: () => void) => {
	const onKey = (event: KeyboardEvent) => {
		if (event.key !== ' ') return

		const target = event.target as HTMLElement | null
		if (isInteractive(target)) return

		event.preventDefault()
		handler()
	}

	$effect(() => {
		window.addEventListener('keydown', onKey)
		return () => window.removeEventListener('keydown', onKey)
	})
}

/** Don't hijack keyboard events for focused elements.  */
const isInteractive = (target: HTMLElement | null): boolean =>
	target?.isContentEditable === true ||
	(target?.matches('input, textarea, select, a, button, summary') ?? false)
