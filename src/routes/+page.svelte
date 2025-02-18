<script>
	import { Canvas, T } from '@threlte/core'
	import { Gizmo, Grid, OrbitControls } from '@threlte/extras'
	import StaticFrames from '$lib/components/StaticFrames.svelte'
	import Pointclouds from '$lib/components/Pointclouds.svelte'
	import Tree from '$lib/components/Tree.svelte'
</script>

<Canvas renderMode="always">
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

	<StaticFrames />

	<Pointclouds />

	<T.DirectionalLight position={[3, 3, 3]} />
	<T.DirectionalLight position={[-3, -3, -3]} />
	<T.AmbientLight />
</Canvas>

<Tree />
