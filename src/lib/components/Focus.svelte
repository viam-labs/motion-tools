<script lang="ts">
	import { T } from '@threlte/core'
	import { Gizmo, TrackballControls } from '@threlte/extras'
	import { Box3, type Object3D, Vector3 } from 'three'

	import { useCameraControls } from '$lib/hooks/useControls.svelte'

	import Camera from './Camera.svelte'

	interface Props {
		object3d: Object3D
	}

	let { object3d }: Props = $props()

	const cameraControls = useCameraControls()

	const box = new Box3()
	const vec = new Vector3()

	let center = $state.raw<[number, number, number]>([0, 0, 0])
	let size = $state.raw<[number, number, number]>([0, 0, 0])

	$effect.pre(() => {
		box.setFromObject(object3d)
		size = box.getSize(vec).toArray()
		center = box.getCenter(vec).toArray()
	})
</script>

<Camera position={[size[0] + 1, size[0] + 1, size[0] + 1]}>
	<TrackballControls
		target={center}
		oncreate={(ref) => cameraControls.set(ref)}
	>
		<Gizmo placement="bottom-right" />
	</TrackballControls>
</Camera>

<T is={object3d} />

<T.BoxHelper
	args={[object3d, 'red']}
	bvh={{ enabled: false }}
	raycast={() => null}
/>
