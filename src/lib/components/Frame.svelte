<script lang="ts">
	import type { Snippet } from 'svelte'
	import type { Object3D } from 'three'
	import type { WorldObject } from '$lib/WorldObject'
	import { useObjectEvents } from '$lib/hooks/useObjectEvents.svelte'
	import Geometry from './Geometry.svelte'

	interface Props {
		uuid: string
		name: string
		geometry?: WorldObject['geometry']
		pose: WorldObject['pose']
		metadata: WorldObject['metadata']
		children?: Snippet<[{ ref: Object3D }]>
	}

	let { uuid, ...rest }: Props = $props()

	const events = useObjectEvents(() => uuid)
</script>

<Geometry
	{uuid}
	{...events}
	{...rest}
/>
