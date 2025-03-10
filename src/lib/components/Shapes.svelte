<script lang="ts">
	import { T } from '@threlte/core'
	import { useWebsocketClient } from '$lib/hooks/useWebsocketClient.svelte'
	import Frame from './Frame.svelte'

	const shapes = useWebsocketClient()
</script>

{#each shapes.current as shape}
	<Frame
		name={shape.name}
		geometry={shape.geometry}
		pose={shape.pose}
		color="purple"
	/>
{/each}

{#each shapes.points as points (points.uuid)}
	<T is={points} />
{/each}
