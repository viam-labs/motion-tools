<script lang="ts">
	import { T } from '@threlte/core'
	import { OrbitControls } from '@threlte/extras'
	import { XR } from '@threlte/xr'
	import { useResources } from '$lib/svelte-sdk'

	import CameraFeed from '$lib/components/xr/CameraFeed.svelte'
	import Controllers from '$lib/components/xr/Controllers.svelte'
	import Hands from '$lib/components/xr/Hands.svelte'
	import OriginMarker from '$lib/components/xr/OriginMarker.svelte'
	import PointDistance from '$lib/components/xr/PointDistance.svelte'
	import Detections from '$lib/components/Detections.svelte'

	const resources = useResources()
	const cameras = $derived(resources.current.filter((r) => r.subtype === 'camera'))
	const camResource = $derived(cameras[0])

	$effect(() => console.log(resources.current))
</script>

<XR>
	<CameraFeed resourceName={camResource?.name} />
	<Controllers />
	<Hands />
	<OriginMarker />

	{#snippet fallback()}
		<T.PerspectiveCamera
			makeDefault
			position={[-10, 10, 10]}
			fov={15}
		>
			<OrbitControls />
		</T.PerspectiveCamera>
	{/snippet}
</XR>

<T.DirectionalLight
	position.x={5}
	position.y={10}
/>
<T.AmbientLight />

{#if resources.current}
	<Detections />
{/if}

<PointDistance />
