<script lang="ts">
	import { T } from '@threlte/core'
	import { TrackballControls, Gizmo, Text, Billboard } from '@threlte/extras'
	import { useFocus, useFocusedObject } from '$lib/hooks/useSelection.svelte'
	import { Keybindings } from '$lib/keybindings'
	import { Box3, PointsMaterial, Vector3 } from 'three'

	const focus = useFocus()
	const focusObject = useFocusedObject()

	const box = new Box3()
	const vec = new Vector3()

	let center = $state.raw<[number, number, number]>([0, 0, 0])
	let size = $state.raw<[number, number, number]>([0, 0, 0])

	$effect(() => {
		if (focusObject.current) {
			box.setFromObject(focusObject.current)
			center = box.getCenter(vec).toArray()
			size = box.getSize(vec).toArray()
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
	position={[2, 0, 0]}
	up={[0, 0, 1]}
>
	<TrackballControls target={center}>
		<Gizmo />
	</TrackballControls>
</T.PerspectiveCamera>

{#if focusObject.current}
	<T is={focusObject.current} />
	<T.BoxHelper args={[focusObject.current, 'red']} />

	<T.Group position={center}>
		<Billboard position={[0, size[1] / 2 + 0.1, size[2] / 2 + 0.1]}>
			<Text
				text={`${size[0].toFixed(4)}m`}
				color="black"
			/>
		</Billboard>
		<Billboard position={[size[1] / 2 + 0.1, 0, size[2] / 2 + 0.1]}>
			<Text
				text={`${size[1].toFixed(4)}m`}
				color="black"
			/>
		</Billboard>

		<Billboard position={[size[0] / 2 + 0.1, size[1] / 2 + 0.1, 0]}>
			<Text
				text={`${size[2].toFixed(4)}m`}
				color="black"
			/>
		</Billboard>
	</T.Group>
{/if}
