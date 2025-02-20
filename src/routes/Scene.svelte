<script lang="ts">
	import { T } from '@threlte/core'
	import { Gizmo, Grid, interactivity, OrbitControls } from '@threlte/extras'
	import Frames from '$lib/components/Frames.svelte'
	import Pointclouds from '$lib/components/Pointclouds.svelte'
	import Geometries from '$lib/components/Geometries.svelte'

	interactivity({ filter: (items) => items.splice(0, 1) })
</script>

<T.PerspectiveCamera
	makeDefault
	near={0.01}
	position={[5, 5, 5]}
	up={[0, 0, 1]}
>
	<OrbitControls>
		<Gizmo />
	</OrbitControls>
</T.PerspectiveCamera>

<Grid
	plane="xy"
	sectionColor="grey"
/>

<Frames />

<Geometries />

<Pointclouds />

<T.DirectionalLight position={[3, 3, 3]} />
<T.DirectionalLight position={[-3, -3, -3]} />
<T.AmbientLight />
