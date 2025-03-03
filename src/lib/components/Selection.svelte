<script lang="ts">
	import { BoxHelper, Object3D } from 'three'
	import { T, useTask } from '@threlte/core'
	import { useSelectionObject } from '$lib/hooks/useSelection.svelte'

	const box = new BoxHelper(new Object3D(), 0x000000)
	const selection = useSelectionObject()

	const { start, stop } = useTask(
		() => {
			if (selection.current) {
				box.update(selection.current)
			}
		},
		{ autoStart: false }
	)

	$effect(() => {
		if (selection.current) {
			box.visible = true
			box.setFromObject(selection.current)
			start()
		} else {
			box.visible = false
			stop()
		}
	})
</script>

<T is={box} />
