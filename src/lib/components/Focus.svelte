<script lang="ts">
	import { T } from '@threlte/core'
	import { TrackballControls, Gizmo } from '@threlte/extras'
	import { Box3, Vector3 } from 'three'
	import Camera from './Camera.svelte'

	let { object3d } = $props()

	const box = new Box3()
	const vec = new Vector3()

	let center = $state.raw<[number, number, number]>([0, 0, 0])
	let size = $state.raw<[number, number, number]>([0, 0, 0])

	$effect.pre(() => {
		box.setFromObject(object3d)
		size = box.getSize(vec).toArray()
		center = box.getCenter(vec).toArray()
	})

	console.log(object3d)
</script>

<Camera position={[0, 0, size[0] + 1]}>
	<TrackballControls target={center}>
		<Gizmo />
	</TrackballControls>
</Camera>

<T is={object3d} />
<T.BoxHelper args={[object3d, 'red']} />
