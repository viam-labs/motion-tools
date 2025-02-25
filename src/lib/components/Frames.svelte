<script lang="ts">
	import Frame from './Frame.svelte'
	import { useFrames } from '$lib/hooks/useFrames.svelte'
	import { useGeometries } from '$lib/hooks/useGeometries.svelte'
	import { onMount } from 'svelte'
	import PortalTarget from './portal/PortalTarget.svelte'

	const frames = useFrames()
	const geometries = useGeometries()

	onMount(() => {
		return () => console.log('unmount')
	})
</script>

<PortalTarget id="world" />

{#each frames.current as frame (frame.name)}
	<Frame
		name={frame.name}
		pose={frame.pose}
		geometry={frame.physicalObject}
		parent={frame.parent}
	/>
{/each}

{#each geometries.current as frame (`${frame.parent}-${frame.name}`)}
	<Frame
		name={`${frame.parent}-${frame.name}`}
		pose={frame.pose}
		geometry={frame.physicalObject}
		parent={frame.parent}
	/>
{/each}
