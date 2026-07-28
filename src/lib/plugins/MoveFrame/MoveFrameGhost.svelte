<!--
@component

A single frame drawn where a staged move would put it: the entity's own
geometry at half opacity, offset by the gizmo's world-space delta.

Box / sphere / capsule / mesh frames ghost their real shape. A frame with no
geometry of its own — a bare reference frame — ghosts as an axes triad, so the
pose it carries is still legible.
-->
<script lang="ts">
	import type { Entity } from 'koota'

	import { T, useThrelte } from '@threlte/core'
	import { Group, Matrix4 } from 'three'

	import { traits, useTrait } from '$lib/ecs'
	import { CapsuleGeometry } from '$lib/three/CapsuleGeometry'
	import { poseToMatrix } from '$lib/transform'

	interface Props {
		entity: Entity
		/** World-space rigid delta the gizmo has staged, applied to every ghost. */
		delta: Matrix4
	}

	const { entity, delta }: Props = $props()

	const { invalidate } = useThrelte()

	const GHOST_OPACITY = 0.5
	const GHOST_COLOR = '#37a06f'
	const AXES_LENGTH = 0.05
	const MM_TO_M = 0.001

	const worldMatrix = useTrait(() => entity, traits.WorldMatrix)
	const center = useTrait(() => entity, traits.Center)
	const box = useTrait(() => entity, traits.Box)
	const sphere = useTrait(() => entity, traits.Sphere)
	const capsule = useTrait(() => entity, traits.Capsule)
	const bufferGeometry = useTrait(() => entity, traits.BufferGeometry)
	const invisible = useTrait(() => entity, traits.InheritedInvisible)

	const hasGeometry = $derived(
		box.current !== undefined ||
			sphere.current !== undefined ||
			capsule.current !== undefined ||
			bufferGeometry.current !== undefined
	)

	/**
	 * Mounts at the scene root with `matrixAutoUpdate = false`, matching the
	 * entity renderers, so writing `WorldMatrix` straight into `matrix` places
	 * the ghost in the same space they draw in.
	 */
	const anchor = new Group()
	anchor.matrixAutoUpdate = false

	const centerMatrix = new Matrix4()

	$effect.pre(() => {
		const world = worldMatrix.current
		if (!world) return

		anchor.matrix.multiplyMatrices(delta, world)

		// The geometry traits are positioned by `Center` relative to the frame,
		// the same offset the instanced renderers apply.
		const offset = center.current
		if (offset) anchor.matrix.multiply(poseToMatrix(offset, centerMatrix))

		anchor.updateMatrixWorld()
		invalidate()
	})

	const capsuleGeometry = $derived(
		capsule.current
			? new CapsuleGeometry(capsule.current.r * MM_TO_M, capsule.current.l * MM_TO_M)
			: undefined
	)
</script>

{#if !invisible.current && worldMatrix.current}
	<T
		is={anchor}
		dispose={false}
	>
		{#if box.current}
			<T.Mesh
				raycast={() => null}
				bvh={{ enabled: false }}
			>
				<T.BoxGeometry
					args={[box.current.x * MM_TO_M, box.current.y * MM_TO_M, box.current.z * MM_TO_M]}
				/>
				<T.MeshBasicMaterial
					color={GHOST_COLOR}
					transparent
					opacity={GHOST_OPACITY}
					depthWrite={false}
				/>
			</T.Mesh>
		{/if}

		{#if sphere.current}
			<T.Mesh
				raycast={() => null}
				bvh={{ enabled: false }}
			>
				<T.SphereGeometry args={[sphere.current.r * MM_TO_M]} />
				<T.MeshBasicMaterial
					color={GHOST_COLOR}
					transparent
					opacity={GHOST_OPACITY}
					depthWrite={false}
				/>
			</T.Mesh>
		{/if}

		{#if capsuleGeometry}
			<T.Mesh
				raycast={() => null}
				bvh={{ enabled: false }}
			>
				<T is={capsuleGeometry} />
				<T.MeshBasicMaterial
					color={GHOST_COLOR}
					transparent
					opacity={GHOST_OPACITY}
					depthWrite={false}
				/>
			</T.Mesh>
		{/if}

		{#if bufferGeometry.current}
			<T.Mesh
				raycast={() => null}
				bvh={{ enabled: false }}
			>
				<T
					is={bufferGeometry.current}
					dispose={false}
				/>
				<T.MeshBasicMaterial
					color={GHOST_COLOR}
					transparent
					opacity={GHOST_OPACITY}
					depthWrite={false}
				/>
			</T.Mesh>
		{/if}

		{#if !hasGeometry}
			<T.AxesHelper
				args={[AXES_LENGTH]}
				raycast={() => null}
				bvh={{ enabled: false }}
			/>
		{/if}
	</T>
{/if}
