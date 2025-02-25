<script lang="ts">
	import { T } from '@threlte/core'
	import { TrackballControls, Gizmo } from '@threlte/extras'
	import { useFocus } from '$lib/hooks/useSelection.svelte'
	import { Keybindings } from '$lib/keybindings'
	import { Box3, Vector3 } from 'three'

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
</script>

<svelte:window
	onkeydown={({ key }) => {
		if (key === Keybindings.ESCAPE) {
			focus.set(undefined)
		}
	}}
/>

<T.PerspectiveCamera
	makeDefault
	position={[0, 0, 5]}
>
	<TrackballControls
		noRotate={false}
		target={center}
	>
		<Gizmo />
	</TrackballControls>
</T.PerspectiveCamera>

{#if focus.current}
	<T is={focus.current} />
	<T.BoxHelper args={[focus.current, 'red']} />
{/if}
