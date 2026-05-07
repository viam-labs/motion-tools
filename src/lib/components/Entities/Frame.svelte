<!--
@component

Renders a Viam Frame object
-->
<script module>
	import { Color } from 'three'

	const colorUtil = new Color()
</script>

<script lang="ts">
	import type { Entity } from 'koota'
	import type { Snippet } from 'svelte'

	import { T, useThrelte } from '@threlte/core'
	import { Portal, PortalTarget } from '@threlte/extras'
	import { Group, type Object3D } from 'three'

	import { asColor } from '$lib/buffer'
	import { colors, resourceColors } from '$lib/color'
	import { traits, useParentName, useTrait } from '$lib/ecs'
	import { useResourceByName } from '$lib/hooks/useResourceByName.svelte'
	import { composeRenderedMatrix } from '$lib/transform'

	import { useEntityEvents } from './hooks/useEntityEvents.svelte'
	import Mesh from './Mesh.svelte'

	interface Props {
		entity: Entity
		children?: Snippet<[{ ref: Object3D }]>
	}

	let { entity, children }: Props = $props()

	const { invalidate } = useThrelte()
	const resourceByName = useResourceByName()

	const name = useTrait(() => entity, traits.Name)
	const parent = useParentName(() => entity)
	const entityColors = useTrait(() => entity, traits.Colors)
	const entityColor = useTrait(() => entity, traits.Color)
	const matrix = useTrait(() => entity, traits.Matrix)
	const editedMatrix = useTrait(() => entity, traits.EditedMatrix)
	const liveMatrix = useTrait(() => entity, traits.LiveMatrix)
	const center = useTrait(() => entity, traits.Center)
	const invisible = useTrait(() => entity, traits.Invisible)

	const events = useEntityEvents(() => entity)

	const color = $derived.by(() => {
		if (entityColors.current) {
			return `#${asColor(entityColors.current, colorUtil).getHexString()}`
		}

		if (entityColor.current) {
			return `#${colorUtil.setRGB(entityColor.current.r, entityColor.current.g, entityColor.current.b).getHexString()}`
		}

		const subtype = resourceByName.current[name.current ?? '']?.subtype
		const resourceColor = resourceColors[subtype as keyof typeof resourceColors]

		if (resourceColor) {
			return resourceColor
		}

		return colors.default
	})

	const group = new Group()
	group.matrixAutoUpdate = false

	$effect.pre(() => {
		if (liveMatrix.current && matrix.current && editedMatrix.current) {
			composeRenderedMatrix(liveMatrix.current, matrix.current, editedMatrix.current, group.matrix)
		} else if (editedMatrix.current) {
			group.matrix.copy(editedMatrix.current)
		} else if (matrix.current) {
			group.matrix.copy(matrix.current)
		} else {
			return
		}
		group.updateMatrixWorld()
		invalidate()
	})
</script>

<Portal id={parent.current}>
	<T
		is={group}
		visible={invisible.current !== true}
	>
		<Mesh
			{entity}
			{color}
			{...events}
			center={center.current}
		/>

		{#if name.current}
			<PortalTarget id={name.current} />
		{/if}

		{@render children?.({ ref: group })}
	</T>
</Portal>
