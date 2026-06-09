import type { ValueOf } from 'type-fest'

export const GizmoModes = {
	Idle: 'idle',
	CoordinateSystem: 'coordinate-system',
	ReferencePlane: 'reference-plane',
	ReferenceGeometry: 'reference-geometry',
	Polyline: 'polyline',
	Arrow: 'arrow',
	VertexNormals: 'vertex-normals',
	SurfaceNormals: 'surface-normals',
} as const

export type GizmoMode = ValueOf<typeof GizmoModes>

export type PlaneAxis = 'yz' | 'xz' | 'xy'
export type PlanePlacement = 'free' | 'offset'

export type GeometryShape = 'box' | 'sphere' | 'capsule'
export type GeometryPlacement = 'at-origin' | 'free'

export type ReferenceShape = GeometryShape | 'plane'

export type LineSpace = 'world' | 'screen'
export type LineMeasure = 'none' | 'segment' | 'total'

export type ArrowAxis = 'x' | 'y' | 'z' | 'surface'

export type NormalsKind = 'surface' | 'vertex'
