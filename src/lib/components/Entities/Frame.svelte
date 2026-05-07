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
	import { Group, Matrix4, type Object3D } from 'three'

	import { asColor } from '$lib/buffer'
	import { colors, resourceColors } from '$lib/color'
	import { traits, useParentName, useTrait } from '$lib/ecs'
	import { useResourceByName } from '$lib/hooks/useResourceByName.svelte'
	import { composeRenderedMatrix, readTraitToMatrix } from '$lib/transform'

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

	const liveScratch = new Matrix4()
	const baselineScratch = new Matrix4()
	const editedScratch = new Matrix4()

	$effect.pre(() => {
		if (liveMatrix.current && matrix.current && editedMatrix.current) {
			readTraitToMatrix(liveMatrix.current, liveScratch)
			readTraitToMatrix(matrix.current, baselineScratch)
			readTraitToMatrix(editedMatrix.current, editedScratch)
			composeRenderedMatrix(liveScratch, baselineScratch, editedScratch, group.matrix)
		} else if (editedMatrix.current) {
			readTraitToMatrix(editedMatrix.current, group.matrix)
		} else if (matrix.current) {
			readTraitToMatrix(matrix.current, group.matrix)
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
