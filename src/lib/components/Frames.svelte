<script lang="ts">
	import Frame from './Frame.svelte'
	import { useFrames } from '$lib/hooks/useFrames.svelte'
	import { useGeometries } from '$lib/hooks/useGeometries.svelte'
	import Portal from './portal/Portal.svelte'
	import PortalTarget from './portal/PortalTarget.svelte'

	const frames = useFrames()
	const geometries = useGeometries()
</script>

<PortalTarget id="world" />

{#each frames.current as frame (frame.name)}
	<Portal id={frame.parent}>
		<Frame
			name={frame.name}
			pose={frame.pose}
			geometry={frame.geometry}
		>
			<PortalTarget id={frame.name} />
		</Frame>
	</Portal>
{/each}

{#each geometries.current as frame (frame.name)}
	<Portal id={frame.parent}>
		<Frame
			name={frame.name}
			pose={frame.pose}
			geometry={frame.geometry}
		>
			<PortalTarget id={frame.name} />
		</Frame>
	</Portal>
{/each}
