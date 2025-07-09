<script lang="ts">
	import type { Snippet } from 'svelte'
	import { Color, type Object3D } from 'three'
	import type { WorldObject } from '$lib/WorldObject'
	import { useObjectEvents } from '$lib/hooks/useObjectEvents.svelte'
	import Geometry from './Geometry.svelte'
	import { useSelected } from '$lib/hooks/useSelection.svelte'
	import { darkenColor, getColorGroup } from '$lib/color'

	interface Props {
		uuid: string
		name: string
		geometry?: WorldObject['geometry']
		pose: WorldObject['pose']
		metadata: WorldObject['metadata']
		children?: Snippet<[{ ref: Object3D }]>
	}

	let { uuid, ...rest }: Props = $props()

	const selected = useSelected()
	const events = useObjectEvents(() => uuid)

	const colorGroup = $derived(getColorGroup(rest.name))
	const colorHelper = new Color()
	const color = $derived.by(() => {
		if (selected.current === uuid) {
			return `#${darkenColor(colorGroup.default ?? rest.metadata.color ?? colors.default, 75).getHexString()}`
		}

		if (rest.metadata.color) {
			return `#${colorHelper.set(rest.metadata.color).getHexString()}`
		}

		return colorGroup.default
	})
</script>

<Geometry
	{uuid}
	{color}
	{...events}
	{...rest}
/>
