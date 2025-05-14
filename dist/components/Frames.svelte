<script lang="ts">
	import { Portal, PortalTarget } from '@threlte/extras'
	import Frame from './Frame.svelte'
	import { useFrames } from '../hooks/useFrames.svelte'
	import { useGeometries } from '../hooks/useGeometries.svelte'

	const frames = useFrames()
	const geometries = useGeometries()
</script>

{#each frames.current as object (object.name)}
	<Portal id={object.referenceFrame}>
		<Frame
			uuid={object.uuid}
			name={object.name}
			pose={object.pose}
			geometry={object.geometry}
			metadata={object.metadata}
		>
			<PortalTarget id={object.name} />
		</Frame>
	</Portal>
{/each}

{#each geometries.current as object (object.name)}
	<Portal id={object.referenceFrame}>
		<Frame
			uuid={object.uuid}
			name={object.name}
			pose={object.pose}
			geometry={object.geometry}
			metadata={object.metadata}
		>
			<PortalTarget id={object.name} />
		</Frame>
	</Portal>
{/each}
