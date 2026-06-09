<script module>
	import { EdgesGeometry, PlaneGeometry } from 'three'

	const planeUtil = new PlaneGeometry(1, 1)
	const edgesUtil = new EdgesGeometry(planeUtil, 0)

	const SURFACE_COLOR = '#FFA726'
	const EDGE_COLOR = '#F4A460'
</script>

<script lang="ts">
	import type { Entity } from 'koota'
	import type { Snippet } from 'svelte'

	import { T, useThrelte } from '@threlte/core'
	import { DoubleSide, Group, Mesh } from 'three'

	import AxesHelper from '$lib/components/AxesHelper.svelte'
	import { useEntityEvents } from '$lib/components/Entities/hooks/useEntityEvents.svelte'
	import { traits, useTrait } from '$lib/ecs'

	import * as gizmoTraits from './traits'

	interface Props {
		entity: Entity
		children?: Snippet
	}

	const { entity, children }: Props = $props()

	const { invalidate } = useThrelte()
	const name = useTrait(() => entity, traits.Name)
	const worldMatrix = useTrait(() => entity, traits.WorldMatrix)
	const opacity = useTrait(() => entity, traits.Opacity)
	const plane = useTrait(() => entity, gizmoTraits.Plane)
	const invisible = useTrait(() => entity, traits.InheritedInvisible)
	const events = useEntityEvents(() => entity)

	const mesh = new Mesh()
	const group = new Group()
	group.matrixAutoUpdate = false

	const currentOpacity = $derived(opacity.current ?? 1)

	$effect(() => {
		if (!worldMatrix.current) return
		group.matrix.copy(worldMatrix.current)
		group.matrix.decompose(group.position, group.quaternion, group.scale)
		group.updateMatrixWorld()
		invalidate()
	})

	$effect(() => {
		if (plane.current) {
			mesh.scale.set(plane.current.width * 0.001, plane.current.height * 0.001, 1)
			invalidate()
		}
	})
</script>

<T
	is={group}
	visible={invisible.current !== true}
>
	<T
		is={mesh}
		name={entity}
		userData.name={name}
		{...events}
	>
		<T
			is={planeUtil}
			dispose={false}
		/>
		<T.MeshToonMaterial
			color={SURFACE_COLOR}
			side={DoubleSide}
			transparent={currentOpacity < 1}
			depthWrite={currentOpacity === 1}
			opacity={currentOpacity}
		/>
		<T.LineSegments
			raycast={() => null}
			bvh={{ enabled: false }}
		>
			<T
				is={edgesUtil}
				dispose={false}
			/>
			<T.LineBasicMaterial color={EDGE_COLOR} />
		</T.LineSegments>
	</T>

	<AxesHelper
		name={entity}
		width={3}
		length={0.1}
		depthTest={false}
	/>

	{@render children?.()}
</T>
