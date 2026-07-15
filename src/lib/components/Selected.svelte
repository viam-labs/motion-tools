<script lang="ts">
	import { T, useTask, useThrelte } from '@threlte/core'
	import { BatchedMesh, Box3, Matrix4, Vector3 } from 'three'
	import { OBB } from 'three/addons/math/OBB.js'

	import { composeBoxMatrix } from '$lib/components/Entities/composeBoxMatrix'
	import { composeCapsuleBoundsMatrix } from '$lib/components/Entities/composeCapsuleMatrices'
	import { composeSphereBoundsMatrix } from '$lib/components/Entities/composeSphereMatrix'
	import { traits, useQuery } from '$lib/ecs'
	import { OBBHelper } from '$lib/three/OBBHelper'

	const box3 = new Box3()
	const obb = new OBB()
	const matrix4 = new Matrix4()

	// Geometry-less frames have no bounds to measure, so a selected reference
	// frame gets a small marker cube at its origin instead — roughly the size of
	// the frame's axes helper — so the selection stays visible.
	const referenceFrameScale = new Vector3(0.1, 0.1, 0.1)

	const { scene, invalidate } = useThrelte()
	const selected = useQuery(traits.Selected)

	const obbHelpers = $derived(selected.current.map((entity) => [entity, new OBBHelper()] as const))

	useTask(
		() => {
			for (const [entity, obbHelper] of obbHelpers) {
				/**
				 * Boxes, capsules, and spheres render instanced, so the entity's
				 * named scene object carries no geometry — derive the OBB straight
				 * from traits.
				 */
				if (composeBoxMatrix(entity, matrix4)) {
					obbHelper.setFromMatrix4(matrix4)
					continue
				}

				if (composeCapsuleBoundsMatrix(entity, matrix4)) {
					obbHelper.setFromMatrix4(matrix4)
					continue
				}

				if (composeSphereBoundsMatrix(entity, matrix4)) {
					obbHelper.setFromMatrix4(matrix4)
					continue
				}

				const object = scene.getObjectByName(entity as unknown as string)
				if (!object) {
					// Reference frames render only an instanced axes helper (no named
					// object) and carry no primitive trait. Anchor a marker cube at the
					// frame origin from its WorldMatrix so the selection is still shown.
					const world = entity.get(traits.WorldMatrix)
					if (world) {
						matrix4.copy(world).scale(referenceFrameScale)
						obbHelper.setFromMatrix4(matrix4)
					}
					continue
				}

				const instance = entity.get(traits.InstanceId)
				if (instance !== undefined && instance >= 0 && object instanceof BatchedMesh) {
					object.getBoundingBoxAt(instance, box3)
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
