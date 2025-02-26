<script lang="ts">
	import { T } from '@threlte/core'
	import { TrackballControls, Gizmo } from '@threlte/extras'
	import { useFocus } from '$lib/hooks/useSelection.svelte'
	import { Keybindings } from '$lib/keybindings'
	import { Box3, PointsMaterial, Vector3 } from 'three'

	const focus = useFocus()
	const box = new Box3()
	const vec = new Vector3()

	let center = $state<[number, number, number]>([0, 0, 0])

	$effect(() => {
		if (focus.current) {
			box.setFromObject(focus.current)
			center = box.getCenter(vec).toArray()
		}
	})

	const onkeydown = ({ key }: KeyboardEvent) => {
		if (key === Keybindings.ESCAPE) {
			focus.set(undefined)
		} else if (key === Keybindings.UP || key === Keybindings.DOWN) {
			if (focus.current?.material instanceof PointsMaterial) {
				focus.current.material.size += key === Keybindings.UP ? 0.001 : -0.001
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

{#if focus.current}
	<T is={focus.current} />
	<T.BoxHelper args={[focus.current, 'red']} />
{/if}
