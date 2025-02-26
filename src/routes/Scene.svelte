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
</script>

{#if focus.current === undefined}
	<T.PerspectiveCamera
		makeDefault
		near={0.01}
		position={[3, 3, 3]}
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
