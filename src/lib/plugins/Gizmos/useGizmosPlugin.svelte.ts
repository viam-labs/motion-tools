import { useThrelte } from '@threlte/core'
import { getContext, setContext } from 'svelte'

const key = Symbol('gizmos-plugin-context')

export type GizmoMode = 'idle' | 'coordinate-system' | 'line' | 'arrow'

export type LineSpace = 'world' | 'screen'
export type PlaneAxis = 'x' | 'y' | 'z'
export type ArrowOrientation = 'to' | 'from'
export type GeometryShape = 'box' | 'sphere' | 'capsule'

interface GizmosPluginContext {
	mode: GizmoMode
	lineSpace: LineSpace
	wireframe: boolean
	planeAxis: PlaneAxis
	arrowOrientation: ArrowOrientation
	geometryShape: GeometryShape
	exit: () => void
}

export const provideGizmosPlugin = (exit: () => void) => {
	let mode = $state<GizmoMode>('idle')
	let lineSpace = $state<LineSpace>('world')
	let wireframe = $state(false)
	let planeAxis = $state<PlaneAxis>('z')
	let arrowOrientation = $state<ArrowOrientation>('from')
	let geometryShape = $state<GeometryShape>('box')

	const ctx: GizmosPluginContext = {
		get mode() {
			return mode
		},
		set mode(value) {
			mode = value
		},

		get lineSpace() {
			return lineSpace
		},
		set lineSpace(value) {
			lineSpace = value
		},

		get wireframe() {
			return wireframe
		},
		set wireframe(value) {
			wireframe = value
		},

		get planeAxis() {
			return planeAxis
		},
		set planeAxis(value) {
			planeAxis = value
		},

		get arrowOrientation() {
			return arrowOrientation
		},
		set arrowOrientation(value) {
			arrowOrientation = value
		},

		get geometryShape() {
			return geometryShape
		},
		set geometryShape(value) {
			geometryShape = value
		},

		exit,
	}

	setContext(key, ctx)
	return ctx
}

export const useGizmosPlugin = () => {
	return getContext<GizmosPluginContext>(key)
}

/**
 * Install Escape-key and right-click handlers that fire `handler()`. Use in
 * gizmo placement tools so the user can cancel a pending placement (or exit
 * gizmo mode entirely) without reaching for the dashboard.
 */
export const useCancelGesture = (handler: () => void) => {
	const { dom } = useThrelte()

	$effect(() => {
		const onKey = (event: KeyboardEvent) => {
			if (event.key === 'Escape') handler()
		}
		const onContext = (event: MouseEvent) => {
			event.preventDefault()
			handler()
		}
		window.addEventListener('keydown', onKey)
		dom.addEventListener('contextmenu', onContext)
		return () => {
			window.removeEventListener('keydown', onKey)
			dom.removeEventListener('contextmenu', onContext)
		}
	})
}

/**
 * Install an Enter-key handler that fires `handler()` — used by gizmo
 * placement tools so the user can confirm a pending placement from the
 * keyboard when the floating panel button is obscured (e.g. by TransformControls
 * rotate rings on the pending arrow).
 */
export const useConfirmGesture = (handler: () => void) => {
	$effect(() => {
		const onKey = (event: KeyboardEvent) => {
			if (event.key !== 'Enter') return
			// Don't hijack Enter while the user is typing into a tweakpane input
			// or any other editable field elsewhere on the page.
			const target = event.target as HTMLElement | null
			if (
				target?.isContentEditable ||
				target?.tagName === 'INPUT' ||
				target?.tagName === 'TEXTAREA' ||
				target?.tagName === 'SELECT'
			) {
				return
			}
			handler()
		}
		window.addEventListener('keydown', onKey)
		return () => {
			window.removeEventListener('keydown', onKey)
		}
	})
}
