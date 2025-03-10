<script lang="ts">
	import { T } from '@threlte/core'
	import { Gizmo, Grid, interactivity } from '@threlte/extras'
	import type CC from 'camera-controls'
	import Frames from '$lib/components/Frames.svelte'
	import Pointclouds from '$lib/components/Pointclouds.svelte'
	import CameraControls from '$lib/components/CameraControls.svelte'
	import Selection from '$lib/components/Selection.svelte'
	import Focus from '$lib/components/Focus.svelte'
	import XR from '$lib/components/XR.svelte'

	import { useFocus } from '$lib/hooks/useSelection.svelte'
	import StaticGeometries from '$lib/components/StaticGeometries.svelte'
	import Shapes from '$lib/components/Shapes.svelte'
	import Camera from '$lib/components/Camera.svelte'

	interactivity()

	const focus = useFocus()

	let controls: CC
</script>

{#if focus.current === undefined}
	<Camera position={[3, 3, 3]}>
		<CameraControls bind:ref={controls}>
			<Gizmo />
		</CameraControls>
	</Camera>

	<StaticGeometries />
	<Frames />
	<Pointclouds />
	<Selection />

	<Shapes />

	<Grid
		plane="xy"
		sectionColor="grey"
	/>
{:else}
	<Focus />
{/if}

<T.DirectionalLight position={[3, 3, 3]} />
<T.DirectionalLight position={[-3, -3, -3]} />
<T.AmbientLight />

<XR />
