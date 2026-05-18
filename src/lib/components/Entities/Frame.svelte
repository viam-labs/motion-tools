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
	import { Group, type Object3D } from 'three'

	import { asColor } from '$lib/buffer'
	import { colors, resourceColors } from '$lib/color'
	import { traits, useTrait } from '$lib/ecs'
	import { useResourceByName } from '$lib/hooks/useResourceByName.svelte'

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
	const entityColors = useTrait(() => entity, traits.Colors)
	const entityColor = useTrait(() => entity, traits.Color)
	const worldMatrix = useTrait(() => entity, traits.WorldMatrix)
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
		if (!worldMatrix.current) return

		group.matrix.copy(worldMatrix.current)

		/**
		 * Keep position/quaternion/scale in sync with matrix so TransformControls
		 * (which reads/writes those fields) sees the entity's actual transform on
		 * drag start. Without this, the gizmo applies its drag delta against an
		 * identity baseline and the frame snaps to identity on first onChange.
		 */
		group.matrix.decompose(group.position, group.quaternion, group.scale)

		group.updateMatrixWorld()
		invalidate()
	})
</script>

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

	{@render children?.({ ref: group })}
</T>
