<script lang="ts">
	import { Portal, PortalTarget } from '@threlte/extras'
	import Frame from './Frame.svelte'
	import { useFrames } from '$lib/hooks/useFrames.svelte'
	import { useGeometries } from '$lib/hooks/useGeometries.svelte'

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

{#each geometries.current as query}
	{#each query.data ?? [] as frame}
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
{/each}
