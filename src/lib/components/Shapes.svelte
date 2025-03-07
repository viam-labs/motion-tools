<script lang="ts">
	import { useWebsocketClient } from '$lib/hooks/useWebsocketClient.svelte'
	import Frame from './Frame.svelte'

	const shapes = useWebsocketClient()

	$inspect(shapes.current)
</script>

{#each shapes.current as shape}
	<Frame
		name={shape.name}
		geometry={shape.geometry}
		pose={shape.pose}
	/>
{/each}
