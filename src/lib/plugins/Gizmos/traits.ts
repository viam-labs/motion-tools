import { trait } from 'koota'

/**  Marks an entity as a user-placed gizmo, not part of the robot's frame system.*/
export const Gizmo = trait(() => true)

/** Transient tag present on a gizmo while the user is still placing or orienting it. */
export const PendingGizmo = trait(() => true)

/** Renderable plane gizmo; normal is +Z in the entity's local frame. */
export const ReferencePlane = trait({ width: 500, height: 500 })

/** Marks an entity as a single-instance arrow gizmo so it can be rendered as its own mesh. */
export const GizmoArrow = trait(() => true)

/** Renders a VertexNormalsHelper over a parent surface entity. Length is in mm. */
export const SurfaceNormals = trait({ length: 100 })
