<script lang="ts">
	import type { Snippet } from 'svelte'
	import { Color, type Object3D } from 'three'
	import type { WorldObject } from '$lib/WorldObject'
	import { useObjectEvents } from '$lib/hooks/useObjectEvents.svelte'
	import Geometry from './Geometry.svelte'
	import { useSelected } from '$lib/hooks/useSelection.svelte'
	import { colors, darkenColor } from '$lib/color'

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

	// Helper to always return an object with selected/default
	function getColorGroup(name: string) {
		console.log('getColorGroup', name)
		// Extract type before first '-' or ':' (e.g., "arm-1:base_link" → "arm")
		const type = name.split(/[-:]/)[0].trim().toLowerCase()
		const group = colors[type as keyof typeof colors]
		if (group && typeof group === 'object' && 'selected' in group && 'default' in group) {
			return group
		}
		console.warn(`Unknown resource type "${type}" from name "${name}", using fallback color.`)
		return {
			selected: colors.selected,
			default: colors.default,
		}
	}

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
