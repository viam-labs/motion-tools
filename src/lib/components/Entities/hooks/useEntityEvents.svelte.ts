import type { Entity } from 'koota'

import { type IntersectionEvent, useCursor } from '@threlte/extras'
import { Matrix4, Vector2 } from 'three'

import { traits, useTrait } from '$lib/ecs'
import { useFocusedEntity, useSelectedEntity } from '$lib/hooks/useSelection.svelte'
import { updateHoverInfo } from '$lib/HoverUpdater.svelte'
import {
	createPose,
	newMatrixTrait,
	poseToMatrixInto,
	readTraitToMatrix,
	writeMatrixToTrait,
} from '$lib/transform'

const hoverPose = createPose()
const worldMatrixScratch = new Matrix4()
const hoverMatrixScratch = new Matrix4()
const instancedScratch = { ...newMatrixTrait(), index: -1 }

export const useEntityEvents = (entity: () => Entity | undefined) => {
	const down = new Vector2()

	const selectedEntity = useSelectedEntity()
	const focusedEntity = useFocusedEntity()
	const cursor = useCursor()
	const invisible = useTrait(entity, traits.Invisible)

	const onpointerenter = (event: IntersectionEvent<MouseEvent>) => {
		if (invisible.current) return

		event.stopPropagation()
		cursor.onPointerEnter()

		const currentEntity = entity()

		if (currentEntity && !currentEntity.has(traits.Hovered)) {
			const hoverInfo = updateHoverInfo(currentEntity, event)
			if (hoverInfo) {
				hoverPose.x = hoverInfo.x
				hoverPose.y = hoverInfo.y
				hoverPose.z = hoverInfo.z
				hoverPose.oX = hoverInfo.oX
				hoverPose.oY = hoverInfo.oY
				hoverPose.oZ = hoverInfo.oZ
				hoverPose.theta = hoverInfo.theta
				poseToMatrixInto(hoverPose, hoverMatrixScratch)
				writeMatrixToTrait(hoverMatrixScratch, instancedScratch)
				instancedScratch.index = hoverInfo.index
				currentEntity.add(traits.InstancedMatrix(instancedScratch))
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

			hoverPose.x = hoverInfo.x
			hoverPose.y = hoverInfo.y
			hoverPose.z = hoverInfo.z
			hoverPose.oX = 0
			hoverPose.oY = 0
			hoverPose.oZ = 1
			hoverPose.theta = 0
			poseToMatrixInto(hoverPose, hoverMatrixScratch)

			const worldMatrixTrait = currentEntity.get(traits.WorldMatrix)
			if (worldMatrixTrait) {
				readTraitToMatrix(worldMatrixTrait, worldMatrixScratch)
			} else {
				worldMatrixScratch.identity()
			}
			worldMatrixScratch.multiply(hoverMatrixScratch)

			writeMatrixToTrait(worldMatrixScratch, instancedScratch)
			instancedScratch.index = hoverInfo.index
			currentEntity.set(traits.InstancedMatrix, instancedScratch)
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
