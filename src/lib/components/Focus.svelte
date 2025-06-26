<script lang="ts">
	import { T } from '@threlte/core'
	import { TrackballControls, Gizmo } from '@threlte/extras'
	import { useFocusedObject3d } from '$lib/hooks/useSelection.svelte'
	import { Box3, Vector3 } from 'three'
	import Camera from './Camera.svelte'

	const focusedObject = useFocusedObject3d()
	const object3d = $derived(focusedObject.current)

	const box = new Box3()
	const vec = new Vector3()

	let center = $state.raw<[number, number, number]>([0, 0, 0])
	let size = $state.raw<[number, number, number]>([0, 0, 0])

	$effect(() => {
		if (object3d) {
			box.setFromObject(object3d)
			size = box.getSize(vec).toArray()
			center = box.getCenter(vec).toArray()
		}
	})
</script>

<Camera position={[size[0], 0, 0]}>
	<TrackballControls target={center}>
		<Gizmo />
	</TrackballControls>
</Camera>

{#if object3d}
	<T is={object3d} />
	<T.BoxHelper args={[object3d, 'red']} />
{/if}
