<script lang="ts">
	import type { Entity } from 'koota'

	import { T } from '@threlte/core'
	import { Portal } from '@threlte/extras'
	import { Color, Quaternion, Vector3 } from 'three'

	import { hierarchy, traits, useWorld } from '$lib/ecs'
	import { BatchedArrow } from '$lib/three/BatchedArrow'
	import { OrientationVector } from '$lib/three/OrientationVector'

	const arrowBatchMap = $state<Record<string, BatchedArrow>>({
		world: new BatchedArrow(),
	})
	const batchEntries = $derived(Object.entries(arrowBatchMap))

	const world = useWorld()

	const direction = new Vector3()
	const origin = new Vector3()
	const color = new Color()
	const tempQuat = new Quaternion()
	const tempScale = new Vector3()
	const tempOv = new OrientationVector()

	// Decompose the matrix in metres directly into the arrow's direction
	// (OV components from the rotation) and origin (translation). No mm/m
	// boundary conversion — the matrix layer is metres throughout.
	const decompose = (entity: Entity): boolean => {
		const matrix = entity.get(traits.Matrix)
		if (!matrix) return false
		matrix.decompose(origin, tempQuat, tempScale)
		tempOv.setFromQuaternion(tempQuat)
		direction.set(tempOv.x, tempOv.y, tempOv.z)
		return true
	}

	const onAdd = (entity: Entity) => {
		const parent = hierarchy.getParentName(entity) ?? 'world'

		arrowBatchMap[parent] ??= new BatchedArrow()
		const batched = arrowBatchMap[parent]

		const colorRGB = entity.get(traits.Color)

		if (!decompose(entity)) {
			direction.set(0, 0, 0)
			origin.set(0, 0, 0)
		}

		const instanceID = batched.addArrow(
			direction,
			origin,
			colorRGB ? color.set(colorRGB.r, colorRGB.g, colorRGB.b) : color.set('yellow')
		)

		entity.add(traits.Instance({ instanceID, meshID: batched.mesh.id }))
	}

	const onMatrixChange = (entity: Entity) => {
		if (!entity.has(traits.Arrow)) return

		const parent = hierarchy.getParentName(entity) ?? 'world'
		const batch = arrowBatchMap[parent]
		const instanceID = entity.get(traits.Instance)?.instanceID

		if (instanceID && instanceID !== -1 && decompose(entity)) {
			batch?.updateArrow(instanceID, direction, origin)
		}
	}

	const onColorChange = (entity: Entity) => {
		if (!entity.has(traits.Arrow)) return

		const parent = hierarchy.getParentName(entity) ?? 'world'
		const batch = arrowBatchMap[parent]
		const instanceID = entity.get(traits.Instance)?.instanceID
		const colorRGB = entity.get(traits.Color)

		if (instanceID && instanceID !== -1 && colorRGB) {
			color.set(colorRGB.r, colorRGB.g, colorRGB.b)
			batch.mesh.setColorAt(instanceID, color)
		}
	}

	const onInstanceRemove = (entity: Entity) => {
		const instance = entity.get(traits.Instance)

		for (const [, batch] of batchEntries) {
			if (batch.mesh.id === instance?.meshID) {
				batch.removeArrow(instance.instanceID)
			}
		}
	}

	$effect(() => {
		const unsubAdd = world.onAdd(traits.Arrow, onAdd)
		const unsubRemove = world.onRemove(traits.Instance, onInstanceRemove)
		const unsubMatrixChange = world.onChange(traits.Matrix, onMatrixChange)
		const unsubColorChange = world.onChange(traits.Color, onColorChange)

		return () => {
			unsubAdd()
			unsubRemove()
			unsubMatrixChange()
			unsubColorChange()
		}
	})
</script>

{#each batchEntries as [parent, batch] (parent)}
	<Portal id={parent}>
		<T
			is={batch.mesh}
			dispose={false}
			bvh={{ enabled: false }}
		/>
	</Portal>
{/each}
