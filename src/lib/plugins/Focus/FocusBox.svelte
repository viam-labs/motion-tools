<script lang="ts">
	import { T, useThrelte } from '@threlte/core'
	import { Gizmo, TrackballControls } from '@threlte/extras'
	import { Box3, Vector3 } from 'three'

	import Camera from '$lib/components/Camera.svelte'
	import { traits, useQuery } from '$lib/ecs'
	import { useCameraControls } from '$lib/hooks/useControls.svelte'

	const { scene } = useThrelte()
	const cameraControls = useCameraControls()
	const selected = useQuery(traits.Selected)

	const box = new Box3()
	const vec = new Vector3()

	let center = $state.raw<[number, number, number]>([0, 0, 0])
	let size = $state.raw<[number, number, number]>([0, 0, 0])

	$effect(() => {
		box.makeEmpty()
		for (const entity of selected.current) {
			const object3d = scene.getObjectByName(entity as unknown as string)
			if (object3d) {
				box.expandByObject(object3d)
			}
		}

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

<T.Box3Helper
	args={[box, 'red']}
	bvh={{ enabled: false }}
	raycast={() => null}
/>
