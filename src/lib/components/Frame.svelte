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

	const colorGroup = getColorGroup(rest.name)
</script>

<Geometry
	{uuid}
	color={rest.metadata.color
		? selected.current === uuid
			? `#${darkenColor(rest.metadata.color, 75).getHexString()}`
			: typeof rest.metadata.color === 'string'
				? rest.metadata.color
				: `#${new Color(rest.metadata.color).getHexString()}`
		: selected.current === uuid
			? colorGroup.selected
			: colorGroup.default}
	{...events}
	{...rest}
/>
