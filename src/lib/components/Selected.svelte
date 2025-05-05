<script lang="ts">
	import { BoxHelper, Object3D } from 'three'
	import { T, useTask } from '@threlte/core'
	import { useSelectedObject3d } from '$lib/hooks/useSelection.svelte'

	const box = new BoxHelper(new Object3D(), 0x000000)
	const selected = useSelectedObject3d()

	const { start, stop } = useTask(
		() => {
			if (selected.current) {
				box.update(selected.current)
			}
		},
		{ autoStart: false }
	)

	$effect(() => {
		if (selected.current) {
			box.visible = true
			box.setFromObject(selected.current)
			start()
		} else {
			box.visible = false
			stop()
		}
	})
</script>

<T is={box} />
