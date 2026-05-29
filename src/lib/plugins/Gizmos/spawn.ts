import { type ConfigurableTrait, type Entity, type World } from 'koota'
import { Matrix4, type Vector3 } from 'three'

import { traits } from '$lib/ecs'

import * as gizmoTraits from './traits'

export const ARROW_COLOR = new Uint8Array([156, 39, 176])
export const REFERENCE_GEOMETRY_COLOR = new Uint8Array([124, 179, 66])
export const REFERENCE_GEOMETRY_OPACITY = 0.5
export const POLYLINE_COLOR = new Uint8Array([33, 150, 243])
export const SURFACE_NORMALS_COLOR = new Uint8Array([0, 188, 212])

const counters = new Map<string, number>()

const nextIndex = (kind: string): number => {
	const next = (counters.get(kind) ?? 0) + 1
	counters.set(kind, next)
	return next
}

interface GizmoSpec {
	kind: string
	traits: ConfigurableTrait[]
	matrix?: Matrix4
}

interface PendingGizmoSpec extends GizmoSpec {
	position: Vector3
}

const commonTraits = (spec: GizmoSpec): ConfigurableTrait[] => [
	traits.Name(`gizmo ${spec.kind} ${nextIndex(spec.kind)}`),
	traits.Matrix(spec.matrix ?? new Matrix4()),
	traits.Removable,
	traits.Transformable,
	gizmoTraits.Gizmo,
]

/** Spawn a gizmo with common traits. */
export const spawnGizmo = (world: World, spec: GizmoSpec): Entity => {
	return world.spawn(...commonTraits(spec), ...spec.traits)
}

/** Spawn a pending gizmo. */
export const spawnPending = (world: World, spec: PendingGizmoSpec): Entity => {
	const matrix =
		spec.matrix ?? new Matrix4().setPosition(spec.position.x, spec.position.y, spec.position.z)
	return world.spawn(...commonTraits({ ...spec, matrix }), gizmoTraits.PendingGizmo, ...spec.traits)
}

/** Confirm a pending gizmo. Drops the `PendingGizmo` tag so it persists. */
export const confirmPending = (entity: Entity): void => {
	if (entity.isAlive() && entity.has(gizmoTraits.PendingGizmo)) {
		entity.remove(gizmoTraits.PendingGizmo)
	}
}

/** Cancel a pending gizmo. Destroys the entity if it's still pending. */
export const cancelPending = (entity: Entity | undefined): void => {
	if (!entity) return
	if (!entity.isAlive()) return
	if (!entity.has(gizmoTraits.PendingGizmo)) return
	entity.destroy()
}
