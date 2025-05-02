<script lang="ts">
	import { Portal, PortalTarget } from '@threlte/extras'
	import Frame from './Frame.svelte'
	import { useFrames } from '$lib/hooks/useFrames.svelte'
	import { useGeometries } from '$lib/hooks/useGeometries.svelte'

	const frames = useFrames()
	const geometries = useGeometries()
</script>

<PortalTarget id="world" />

{#each frames.current as object (object.name)}
	<Portal id={object.referenceFrame}>
		<Frame {object}>
			<PortalTarget id={object.name} />
		</Frame>
	</Portal>
{/each}

{#each geometries.current as object (object.name)}
	<Portal id={object.referenceFrame}>
		<Frame {object}>
			<PortalTarget id={object.name} />
		</Frame>
	</Portal>
{/each}
