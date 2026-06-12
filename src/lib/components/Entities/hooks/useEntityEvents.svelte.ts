import type { Entity } from 'koota'

import { type IntersectionEvent, useCursor } from '@threlte/extras'
import { MathUtils, Matrix4, Quaternion, Vector2 } from 'three'

import { traits, useTrait, useWorld } from '$lib/ecs'
import { type HoverInfo, updateHoverInfo } from '$lib/HoverUpdater.svelte'
import { OrientationVector } from '$lib/three/OrientationVector'

const tempHoverMatrix = new Matrix4()
const hoverQuat = new Quaternion()
const hoverOv = new OrientationVector()

const infoToLocalMatrix = (info: HoverInfo, out: Matrix4) => {
	hoverOv.set(info.oX, info.oY, info.oZ, MathUtils.degToRad(info.theta))
	hoverOv.toQuaternion(hoverQuat)
	out.makeRotationFromQuaternion(hoverQuat)
	out.setPosition(info.x, info.y, info.z)
}

/**
 * Shared implementation behind `useEntityEvents` and
 * `useInstancedEntityEvents`. `entityForEvent` maps an event to the entity it
 * targets; `hookEntity` is the renderer's fixed entity when it has one (used
 * to watch for the entity turning invisible), or `undefined` for instanced
 * renderers that serve many entities.
 */
const createEntityEvents = (
	entityForEvent: (event: IntersectionEvent<MouseEvent>) => Entity | undefined,
	hookEntity: () => Entity | undefined
) => {
	const down = new Vector2()

	const world = useWorld()
	const cursor = useCursor()
	const invisible = useTrait(hookEntity, traits.InheritedInvisible)

	const hoverEntity = (currentEntity: Entity, event: IntersectionEvent<MouseEvent>) => {
		const hoverInfo = updateHoverInfo(currentEntity, event)
		if (hoverInfo) {
			infoToLocalMatrix(hoverInfo, tempHoverMatrix)
			const worldMatrix = currentEntity.get(traits.WorldMatrix)
			const composed = new Matrix4()
			if (worldMatrix) {
				composed.copy(worldMatrix).multiply(tempHoverMatrix)
			} else {
				composed.copy(tempHoverMatrix)
			}
			currentEntity.add(
				traits.InstancedMatrix({
					matrix: composed,
					index: hoverInfo.index,
				})
			)
		}
		currentEntity.add(traits.Hovered)
	}

	const onpointerenter = (event: IntersectionEvent<MouseEvent>) => {
		if (invisible.current) return

		event.stopPropagation()
		cursor.onPointerEnter()

		const currentEntity = entityForEvent(event)

		if (currentEntity && !currentEntity.has(traits.Hovered)) {
			hoverEntity(currentEntity, event)
		}
	}

	const onpointermove = (event: IntersectionEvent<MouseEvent>) => {
		if (invisible.current) return

		event.stopPropagation()

		const currentEntity = entityForEvent(event)

		if (!currentEntity) return

		if (currentEntity.has(traits.Hovered)) {
			const hoverInfo = updateHoverInfo(currentEntity, event)
			if (!hoverInfo) return

			infoToLocalMatrix(hoverInfo, tempHoverMatrix)

			const instanced = currentEntity.get(traits.InstancedMatrix)
			if (!instanced) return

			const worldMatrix = currentEntity.get(traits.WorldMatrix)
			if (worldMatrix) {
				instanced.matrix.copy(worldMatrix).multiply(tempHoverMatrix)
			} else {
				instanced.matrix.copy(tempHoverMatrix)
			}
			instanced.index = hoverInfo.index
			currentEntity.changed(traits.InstancedMatrix)
		} else {
			// A move can target an entity that never got an enter event — e.g.
			// an instanced renderer recycled an instance id to a new entity
			// under a motionless cursor — so promote the move to a hover.
			hoverEntity(currentEntity, event)
		}
	}

	const onpointerleave = (event: IntersectionEvent<MouseEvent>) => {
		event.stopPropagation()
		cursor.onPointerLeave()

		const currentEntity = entityForEvent(event)

		if (currentEntity?.has(traits.Hovered)) {
			currentEntity.remove(traits.Hovered)
		}
		if (currentEntity?.has(traits.InstancedMatrix)) {
			currentEntity.remove(traits.InstancedMatrix)
		}
	}

	const onpointerdown = (event: IntersectionEvent<MouseEvent>) => {
		if (invisible.current) return

		down.copy(event.pointer)
	}

	const onclick = (event: IntersectionEvent<MouseEvent>) => {
		if (invisible.current) {
			return
		}

		event.stopPropagation()

		if (down.distanceToSquared(event.pointer) >= 0.1) {
			return
		}

		const currentEntity = entityForEvent(event)
		if (!currentEntity) return

		if (event.nativeEvent.shiftKey) {
			if (currentEntity.has(traits.Selected)) {
				currentEntity.remove(traits.Selected)
			} else {
				currentEntity.add(traits.Selected)
			}
		} else {
			for (const entity of world.query(traits.Selected)) {
				if (entity !== currentEntity) {
					entity.remove(traits.Selected)
				}
			}
			if (!currentEntity.has(traits.Selected)) {
				currentEntity.add(traits.Selected)
			}
		}

		if (event.instanceId || event.batchId) {
			currentEntity.add(traits.InstanceId(event.instanceId ?? event.batchId))
		}
	}

	$effect(() => {
		if (invisible.current) {
			cursor.onPointerLeave()

			const currentEntity = hookEntity()
			if (currentEntity?.has(traits.Hovered)) {
				currentEntity.remove(traits.Hovered)
			}

			if (currentEntity?.has(traits.InstancedMatrix)) {
				currentEntity.remove(traits.InstancedMatrix)
			}
		}
	})

	return {
		onpointerenter,
		onpointermove,
		onpointerleave,
		onpointerdown,
		onclick,
	}
}

/**
 * Pointer handlers for a renderer that draws a single entity — every event
 * targets the closed-over entity.
 */
export const useEntityEvents = (entity: () => Entity | undefined) =>
	createEntityEvents(entity, entity)

/**
 * Pointer handlers for an instanced renderer that draws many entities through
 * one object — `entityForEvent` maps each event back to the entity it targets
 * (typically via `event.instanceId`). Threlte keys hover identity by object
 * uuid + instance id, so enter/leave fire per instance with the id on the
 * event. There is no hook-level invisibility watcher: invisible instances are
 * skipped by the instanced raycast, so they never receive events.
 */
export const useInstancedEntityEvents = (
	entityForEvent: (event: IntersectionEvent<MouseEvent>) => Entity | undefined
) => createEntityEvents(entityForEvent, () => undefined)
