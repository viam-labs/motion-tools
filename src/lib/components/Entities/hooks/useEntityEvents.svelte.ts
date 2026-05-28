import type { Entity } from 'koota'

import { type IntersectionEvent, useCursor } from '@threlte/extras'
import { MathUtils, Matrix4, Quaternion, Vector2 } from 'three'

import { traits, useTrait } from '$lib/ecs'
import { useFocusedEntity, useSelectedEntity } from '$lib/hooks/useSelection.svelte'
import { type HoverInfo, updateHoverInfo } from '$lib/HoverUpdater'
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

export const useEntityEvents = (entity: () => Entity | undefined) => {
	const down = new Vector2()

	const selectedEntity = useSelectedEntity()
	const focusedEntity = useFocusedEntity()
	const cursor = useCursor()
	const invisible = useTrait(entity, traits.InheritedInvisible)

	const onpointerenter = (event: IntersectionEvent<MouseEvent>) => {
		if (invisible.current) return

		event.stopPropagation()
		cursor.onPointerEnter()

		const currentEntity = entity()

		if (currentEntity && !currentEntity.has(traits.Hovered)) {
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
	}

	const onpointermove = (event: IntersectionEvent<MouseEvent>) => {
		if (invisible.current) return

		event.stopPropagation()

		const currentEntity = entity()

		if (currentEntity?.has(traits.Hovered)) {
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
		}
	}

	const onpointerleave = (event: IntersectionEvent<MouseEvent>) => {
		event.stopPropagation()
		cursor.onPointerLeave()

		const currentEntity = entity()

		if (currentEntity?.has(traits.Hovered)) {
			currentEntity.remove(traits.Hovered)
		}
		if (currentEntity?.has(traits.InstancedMatrix)) {
			currentEntity.remove(traits.InstancedMatrix)
		}
	}

	const ondblclick = (event: IntersectionEvent<MouseEvent>) => {
		if (invisible.current) return

		event.stopPropagation()

		const currentEntity = entity()
		focusedEntity.set(currentEntity, event.instanceId ?? event.batchId)
	}

	const onpointerdown = (event: IntersectionEvent<MouseEvent>) => {
		if (invisible.current) return

		down.copy(event.pointer)
	}

	const onclick = (event: IntersectionEvent<MouseEvent>) => {
		if (invisible.current) return

		event.stopPropagation()

		if (down.distanceToSquared(event.pointer) < 0.1) {
			const currentEntity = entity()
			selectedEntity.set(currentEntity, event.instanceId ?? event.batchId)
		}
	}

	$effect(() => {
		if (invisible.current) {
			cursor.onPointerLeave()

			const currentEntity = entity()
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
		ondblclick,
		onpointerdown,
		onclick,
	}
}
