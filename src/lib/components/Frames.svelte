<script lang="ts">
	import { Edges } from '@threlte/extras'
	import Portal from './Portal/Portal.svelte'
	import PortalTarget from './Portal/PortalTarget.svelte'
	import { useFrames } from '$lib/hooks/useFrames.svelte'
	import { useGeometries } from '$lib/hooks/useGeometries.svelte'
	import Clickable from './Clickable.svelte'
	import { darkenColor } from '$lib/color'
	import AxesHelper from './AxesHelper.svelte'
	import Frame from './Frame.svelte'

	const frames = useFrames()
	const geometries = useGeometries()
</script>

<PortalTarget id="world" />

{#each frames.current as { name, pose, geometry } (name)}
	<Portal id={pose.referenceFrame}>
		<Frame
			{name}
			pose={pose.pose}
			{geometry}
		>
			<PortalTarget id={name} />
		</Frame>
	</Portal>
{/each}

{#each geometries.current as { name, pose, geometry } (name)}
	<Portal id={mesh.userData.parent}>
		<Frame
			{name}
			pose={pose.pose}
			{geometry}
		/>
	</Portal>
{/each}
