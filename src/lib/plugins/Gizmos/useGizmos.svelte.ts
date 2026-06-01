import { getContext, setContext } from 'svelte'
import { Vector3 } from 'three'

import { traits } from '$lib/ecs'

import type {
	ArrowAxis,
	GeometryPlacement,
	GeometryShape,
	GizmoMode,
	LineMeasure,
	LineSpace,
	PlaneAxis,
	PlanePlacement,
} from './gizmos'

const key = Symbol('gizmos-plugin-context')

const planeNormalForAxis = {
	yz: new Vector3(1, 0, 0),
	xz: new Vector3(0, 1, 0),
	xy: new Vector3(0, 0, 1),
} as const satisfies Record<PlaneAxis, Vector3>

const geometryTraits = {
	box: traits.Box({ x: 200, y: 200, z: 200 }),
	sphere: traits.Sphere({ r: 100 }),
	capsule: traits.Capsule({ l: 200, r: 50 }),
} as const

export const provideGizmos = (exit: () => void) => {
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
			return planeNormalForAxis[planeAxis].clone()
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

export const useGizmos = () => {
	return getContext<ReturnType<typeof provideGizmos>>(key)
}
