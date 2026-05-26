import { type ConfigurableTrait, type Entity, type World } from 'koota'
import { Matrix4, type Vector3 } from 'three'

import { traits } from '$lib/ecs'

import * as gizmoTraits from './traits'

/**
 * Hot pink (#FF69B4) in normalized RGB. Used as the default tint for gizmos
 * with a visible surface so they pop against the rest of the scene and are
 * obviously not real frame-system geometry.
 */
export const GIZMO_COLOR = { r: 1, g: 0, b: 1 } as const

/**
 * `traits.DotColors` is a `Uint8Array` of 8-bit RGB bytes (line renderer
 * normalizes via `byte / 255`). Derive the byte form from `GIZMO_COLOR` so
 * changing the gizmo color in one place updates line dots too — and the
 * default doesn't silently fall out of sync with the line color.
 */
export const GIZMO_COLOR_BYTES = new Uint8Array([
	Math.round(GIZMO_COLOR.r * 255),
	Math.round(GIZMO_COLOR.g * 255),
	Math.round(GIZMO_COLOR.b * 255),
])

const counters = new Map<string, number>()

const nextIndex = (kind: string): number => {
	const next = (counters.get(kind) ?? 0) + 1
	counters.set(kind, next)
	return next
}

/**
 * Build a Matrix4 trait initializer from a world-space position. Identity
 * rotation, unit scale. Allocates a fresh `Matrix4` per call so each entity
 * owns its own instance.
 */
export const matrixAt = (position: Vector3): Matrix4 => {
	return new Matrix4().setPosition(position.x, position.y, position.z)
}

export interface GizmoSpec {
	/** Display kind used in the auto-generated name (e.g. "box"). */
	kind: string
	/** Extra traits specific to the gizmo (e.g. `traits.Box(...)`). */
	extras: ConfigurableTrait[]
	/**
	 * Optional explicit Matrix4 to use as the gizmo's local matrix. When
	 * omitted the entity spawns at the origin with identity rotation/scale.
	 */
	matrix?: Matrix4
}

export interface PendingGizmoSpec extends GizmoSpec {
	/** World-space placement for the pending entity. */
	position: Vector3
}

const commonTraits = (spec: GizmoSpec): ConfigurableTrait[] => [
	traits.Name(`gizmo ${spec.kind} ${nextIndex(spec.kind)}`),
	traits.Matrix(spec.matrix ?? new Matrix4()),
	traits.Removable,
	traits.Transformable,
	gizmoTraits.Gizmo,
]

/**
 * Spawn a finalized gizmo entity directly — no pending/preview state. Used
 * by gizmos that don't need a placement step (plane, geometry primitives) and
 * just appear at the world origin, ready to be repositioned via the Details
 * panel.
 */
export const spawnGizmo = (world: World, spec: GizmoSpec): Entity => {
	return world.spawn(...commonTraits(spec), ...spec.extras)
}

/**
 * Spawn a pending gizmo entity carrying the standard `Gizmo` / `PendingGizmo`
 * tags plus the common traits gizmos share. The `PendingGizmo` tag is the
 * signal for placement tools that the entity is in-flight.
 */
export const spawnPending = (world: World, spec: PendingGizmoSpec): Entity => {
	return world.spawn(
		...commonTraits({
			...spec,
			matrix: spec.matrix ?? matrixAt(spec.position),
		}),
		gizmoTraits.PendingGizmo,
		...spec.extras
	)
}

/** Confirm a pending gizmo — drop the `PendingGizmo` tag so it persists. */
export const confirmPending = (entity: Entity): void => {
	if (entity.isAlive() && entity.has(gizmoTraits.PendingGizmo)) {
		entity.remove(gizmoTraits.PendingGizmo)
	}
}

/**
 * Cancel a pending gizmo — destroy the entity, but only if it's still pending.
 *
 * Tools call this from `onDestroy` as a safety net for the case where the
 * user toggles out of gizmo mode while a placement is in flight. The guard
 * makes the call a no-op for entities that have already been confirmed
 * (their `PendingGizmo` tag was removed by `confirmPending`), so a stale
 * `pending` reference reaching `onDestroy` after a normal confirm doesn't
 * also destroy the just-committed entity.
 */
export const cancelPending = (entity: Entity): void => {
	if (entity.isAlive() && entity.has(gizmoTraits.PendingGizmo)) {
		entity.destroy()
	}
}
