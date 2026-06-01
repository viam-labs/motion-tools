import { trait } from 'koota'

export type PolylineMeasureMode = 'segment' | 'total'

/**  Marks an entity as a user-placed gizmo, not part of the robot's frame system.*/
export const Gizmo = trait(() => true)

/** Transient tag present on a gizmo while the user is still placing or orienting it. */
export const PendingGizmo = trait(() => true)

/** Renderable plane gizmo; normal is +Z in the entity's local frame. */
export const ReferencePlane = trait({ width: 500, height: 500 })

/** Marks an entity as a single-instance arrow gizmo so it can be rendered as its own mesh. */
export const GizmoArrow = trait(() => true)

/** Renders a VertexNormalsHelper over a parent surface entity. Length is in mm. */
export const VertexNormals = trait({ length: 100 })

/** Renders one outward-pointing segment per triangle face of a parent surface. Length is in mm. */
export const SurfaceNormals = trait({ length: 100 })

/** Renders distance labels along a polyline gizmo. */
export const PolylineMeasure = trait(() => ({ mode: 'segment' as PolylineMeasureMode }))
