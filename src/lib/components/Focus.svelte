<script lang="ts">
	import { isInstanceOf, T } from '@threlte/core'
	import { TrackballControls, Gizmo, type IntersectionEvent } from '@threlte/extras'
	import { useFocused, useFocusedObject3d } from '$lib/hooks/useSelection.svelte'
	import { Keybindings } from '$lib/keybindings'
	import { Box3, Vector3 } from 'three'
	import Camera from './Camera.svelte'

	const focus = useFocused()
	const focusedObject = useFocusedObject3d()
	const object3d = $derived(focusedObject.current)

	const box = new Box3()
	const vec = new Vector3()

	let center = $state.raw<[number, number, number]>([0, 0, 0])

	$effect(() => {
		if (object3d) {
			box.setFromObject(object3d)
			center = box.getCenter(vec).toArray()
		}
	})

	const onkeydown = ({ key }: KeyboardEvent) => {
		if (key === Keybindings.ESCAPE) {
			focus.set(undefined)
		} else if (key === Keybindings.UP || key === Keybindings.DOWN) {
			if (object3d && 'material' in object3d && isInstanceOf(object3d.material, 'PointsMaterial')) {
				object3d.material.size += key === Keybindings.UP ? 0.001 : -0.001
			}
		}
	}
</script>

<svelte:window {onkeydown} />

<Camera position={[2, 0, 0]}>
	<TrackballControls target={center}>
		<Gizmo />
	</TrackballControls>
</Camera>

{#if object3d}
	<T is={object3d} />
	<T.BoxHelper args={[object3d, 'red']} />
{/if}
