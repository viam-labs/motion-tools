import { type ConfigurableTrait, type Entity, type World } from 'koota'
import { Matrix4, type Vector3 } from 'three'

import { traits } from '$lib/ecs'

import * as gizmoTraits from './traits'

export const ARROW_COLOR = new Uint8Array([156, 39, 176])
export const REFERENCE_GEOMETRY_COLOR = new Uint8Array([124, 179, 66])
export const REFERENCE_GEOMETRY_OPACITY = 0.5
export const POLYLINE_COLOR = new Uint8Array([33, 150, 243])
export const VERTEX_NORMALS_COLOR = new Uint8Array([0, 188, 212])
export const SURFACE_NORMALS_COLOR = new Uint8Array([255, 152, 0])

interface GizmoSpec {
	kind: string
	traits: ConfigurableTrait[]
	matrix?: Matrix4
}

interface PendingGizmoSpec extends GizmoSpec {
	position: Vector3
}

export const spawnGizmo = (world: World, spec: GizmoSpec) =>
	world.spawn(...commonTraits(world, spec), ...spec.traits)

export const spawnPending = (world: World, spec: PendingGizmoSpec) => {
	const matrix =
		spec.matrix ?? new Matrix4().setPosition(spec.position.x, spec.position.y, spec.position.z)

	return world.spawn(
		...commonTraits(world, { ...spec, matrix }),
		gizmoTraits.PendingGizmo,
		...spec.traits
	)
}

export const confirmPending = (entity: Entity) => {
	if (entity.isAlive() && entity.has(gizmoTraits.PendingGizmo)) {
		entity.remove(gizmoTraits.PendingGizmo)
	}
}

export const cancelPending = (entity: Entity | undefined) => {
	if (!entity) return
	if (!entity.isAlive()) return
	if (!entity.has(gizmoTraits.PendingGizmo)) return
	entity.destroy()
}

const nextIndex = (world: World, kind: string) => {
	const used = new Set<number>()
	for (const entity of world.query(traits.Name)) {
		const name = entity.get(traits.Name)
		if (!name?.startsWith(kind)) continue

		const n = Number(name.slice(kind.length))
		if (Number.isInteger(n) && n > 0) used.add(n)
	}

	let i = 1
	while (used.has(i)) i++
	return i
}

const commonTraits = (world: World, spec: GizmoSpec) => [
	traits.Name(`${spec.kind} ${nextIndex(world, spec.kind)}`),
	traits.Matrix(spec.matrix ?? new Matrix4()),
	traits.Removable,
	traits.Transformable,
	gizmoTraits.Gizmo,
]
