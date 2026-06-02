<script lang="ts">
	import { T, useTask, useThrelte } from '@threlte/core'
	import { BatchedMesh, Box3 } from 'three'
	import { OBB } from 'three/addons/math/OBB.js'

	import { traits, useQuery } from '$lib/ecs'
	import { OBBHelper } from '$lib/three/OBBHelper'

	const box3 = new Box3()
	const obb = new OBB()

	const { scene, invalidate } = useThrelte()
	const selected = useQuery(traits.Selected)

	const obbHelpers = $derived(selected.current.map((entity) => [entity, new OBBHelper()] as const))

	useTask(
		() => {
			for (const [entity, obbHelper] of obbHelpers) {
				const object = scene.getObjectByName(entity as unknown as string)
				if (!object) continue

				const instance = entity.get(traits.InstanceId)
				if (instance !== undefined && instance >= 0) {
					;(object as BatchedMesh).getBoundingBoxAt(instance, box3)
					obb.fromBox3(box3)
					obbHelper.setFromOBB(obb)
				} else {
					obbHelper.setFromObject(object)
				}
			}

			invalidate()
		},
		{
			running: () => selected.current.length > 0,
			autoInvalidate: false,
		}
	)
</script>

{#each obbHelpers as [entity, obbHelper] (entity)}
	<T
		is={obbHelper}
		raycast={() => null}
		bvh={{ enabled: false }}
	/>
{/each}
