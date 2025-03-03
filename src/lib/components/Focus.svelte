<script lang="ts">
	import { T } from '@threlte/core'
	import { TrackballControls, Gizmo } from '@threlte/extras'
	import { useFocus, useFocusedObject } from '$lib/hooks/useSelection.svelte'
	import { Keybindings } from '$lib/keybindings'
	import { Box3, PointsMaterial, Vector3 } from 'three'

	const focus = useFocus()
	const focusObject = useFocusedObject()

	const box = new Box3()
	const vec = new Vector3()

	let center = $state<[number, number, number]>([0, 0, 0])

	$effect(() => {
		if (focusObject.current) {
			box.setFromObject(focusObject.current)
			center = box.getCenter(vec).toArray()
		}
	})

	const onkeydown = ({ key }: KeyboardEvent) => {
		if (key === Keybindings.ESCAPE) {
			focus.set(undefined)
		} else if (key === Keybindings.UP || key === Keybindings.DOWN) {
			if (focusObject.current?.material instanceof PointsMaterial) {
				focusObject.current.material.size += key === Keybindings.UP ? 0.001 : -0.001
			}
		}
	}
</script>

<svelte:window {onkeydown} />

<T.PerspectiveCamera
	makeDefault
	position={[0, 0, 2]}
>
	<TrackballControls target={center}>
		<Gizmo />
	</TrackballControls>
</T.PerspectiveCamera>

{#if focusObject.current}
	<T is={focusObject.current} />
	<T.BoxHelper args={[focusObject.current, 'red']} />
{/if}
