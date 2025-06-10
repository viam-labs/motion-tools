<script lang="ts">
	import type { Snippet } from 'svelte'
	import type { Object3D } from 'three'
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
</script>

<Geometry
	{uuid}
	color={selected.current === uuid
		? `#${darkenColor(rest.metadata.color ?? colors.default, 75).getHexString()}`
		: undefined}
	{...events}
	{...rest}
/>
