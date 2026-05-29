<script module>
	import { Color } from 'three'

	import { ARROW_LENGTH, createArrowGeometry } from '$lib/three/arrow'

	const colorUtil = new Color()
	const sharedArrowGeometry = createArrowGeometry()
</script>

<script lang="ts">
	import type { Entity } from 'koota'
	import type { Snippet } from 'svelte'

	import { T, useThrelte } from '@threlte/core'
	import { Group, Mesh } from 'three'

	import { colors } from '$lib/color'
	import AxesHelper from '$lib/components/AxesHelper.svelte'
	import { useEntityEvents } from '$lib/components/Entities/hooks/useEntityEvents.svelte'
	import { traits, useTrait } from '$lib/ecs'

	interface Props {
		entity: Entity
		children?: Snippet
	}

	let { entity, children }: Props = $props()

	const { invalidate } = useThrelte()
	const name = useTrait(() => entity, traits.Name)
	const worldMatrix = useTrait(() => entity, traits.WorldMatrix)
	const entityColor = useTrait(() => entity, traits.Color)
	const opacity = useTrait(() => entity, traits.Opacity)
	const showAxesHelper = useTrait(() => entity, traits.ShowAxesHelper)
	const invisible = useTrait(() => entity, traits.Invisible)

	const events = useEntityEvents(() => entity)

	const color = $derived.by(() => {
		if (entityColor.current) {
			return `#${colorUtil
				.setRGB(entityColor.current.r, entityColor.current.g, entityColor.current.b)
				.getHexString()}`
		}

		return colors.default
	})

	const currentOpacity = $derived(opacity.current ?? 1)
	const group = new Group()
	group.matrixAutoUpdate = false

	const mesh = new Mesh()
	mesh.position.y = -ARROW_LENGTH

	$effect.pre(() => {
		if (!worldMatrix.current) return

		group.matrix.copy(worldMatrix.current)
		group.matrix.decompose(group.position, group.quaternion, group.scale)
		group.updateMatrixWorld()
		invalidate()
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
			is={sharedArrowGeometry}
			dispose={false}
		/>
		<T.MeshToonMaterial
			{color}
			transparent={currentOpacity < 1}
			depthWrite={currentOpacity === 1}
			opacity={currentOpacity}
		/>
	</T>

	{#if showAxesHelper.current}
		<AxesHelper
			name={entity}
			width={3}
			length={0.1}
		/>
	{/if}

	{@render children?.()}
</T>
