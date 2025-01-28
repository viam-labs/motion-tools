<script lang="ts">
	import { T } from '@threlte/core'
	import { OrbitControls } from '@threlte/extras'
	import { XR } from '@threlte/xr'
	import CameraFeed from './CameraFeed.svelte'
	import Controllers from './Controllers.svelte'
	import Hands from './Hands.svelte'
	import { useResources } from '$lib/hooks/useResources.svelte'
	import OriginMarker from './OriginMarker.svelte'
	import Detections from './Detections.svelte'

	const resources = useResources()
	const cameras = $derived($resources.filter((r) => r.subtype === 'camera'))
	const camResource = $derived(cameras[0])

	$effect(() => console.log($resources))
</script>

<XR>
	<CameraFeed resourceName={camResource?.name} />
	<Controllers />
	<Hands />
	<OriginMarker />
</XR>

<T.PerspectiveCamera
	makeDefault
	position={[-10, 10, 10]}
	fov={15}
>
	<OrbitControls />
</T.PerspectiveCamera>

<T.DirectionalLight
	position.x={5}
	position.y={10}
/>
<T.AmbientLight />

{#if $resources}
	<Detections />
{/if}
