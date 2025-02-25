<script lang="ts">
	import { T } from '@threlte/core'
	import { Gizmo, Grid, interactivity } from '@threlte/extras'
	import type CC from 'camera-controls'
	import Frames from '$lib/components/Frames.svelte'
	import Pointclouds from '$lib/components/Pointclouds.svelte'
	import CameraControls from '$lib/components/CameraControls.svelte'
	import Selection from '$lib/components/Selection.svelte'
	import Focus from '$lib/components/Focus.svelte'

	import { useFocus } from '$lib/hooks/useSelection.svelte'

	interactivity()

	const focus = useFocus()

	let controls: CC

	$effect(() => console.log(focus.current))
</script>

{#if focus.current === undefined}
	<T.PerspectiveCamera
		makeDefault
		near={0.01}
		position={[5, 5, 5]}
		up={[0, 0, 1]}
		oncreate={(ref) => ref.lookAt(0, 0, 0)}
	>
		<CameraControls bind:ref={controls}>
			<Gizmo />
		</CameraControls>
	</T.PerspectiveCamera>

	<Frames />
	<Pointclouds />
	<Selection />
{:else}
	<Focus />
{/if}

<Grid
	plane="xy"
	sectionColor="grey"
/>

<T.DirectionalLight position={[3, 3, 3]} />
<T.DirectionalLight position={[-3, -3, -3]} />
<T.AmbientLight />
