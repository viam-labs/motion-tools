import { trait } from 'koota'

/**
 * Marks an entity as a user-placed gizmo — an ad-hoc shape dropped via the
 * Gizmo dashboard tool, not part of the robot's frame system.
 */
export const Gizmo = trait(() => true)

/**
 * Transient tag present on a gizmo while the user is still placing or
 * orienting it. Removed on Confirm; the entity is destroyed on Cancel.
 */
export const PendingGizmo = trait(() => true)

/**
 * Renderable plane gizmo. Width/height in millimeters; normal is +Z in the
 * entity's local frame.
 */
export const Plane = trait({ width: 500, height: 500 })

/**
 * Marks an entity as a single-instance arrow gizmo so it can be rendered as
 * its own mesh (selectable, hoverable) instead of being folded into the
 * shared `BatchedArrows` pool.
 */
export const GizmoArrow = trait(() => true)

/**
 * Renders an arrow gizmo with its head at the entity's local origin instead
 * of the tail. Use when the user wants the arrow to point *at* the picked
 * position rather than originating *from* it.
 */
export const HeadAtOrigin = trait(() => true)
