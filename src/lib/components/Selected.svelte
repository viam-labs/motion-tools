<script lang="ts">
	import { Box3, Object3D } from 'three'
	import { T, useTask, useThrelte } from '@threlte/core'
	import { useSelectedObject } from '$lib/hooks/useSelection.svelte'
	import { BoxHelper } from '$lib/three/BoxHelper'

	const { scene } = useThrelte()

	const box = new BoxHelper(new Object3D(), 0x000000)
	const selected = useSelectedObject()

	const { start, stop } = useTask(() => box.update(), { autoStart: false })

	$effect.pre(() => {
		if (selected.current) {
			start()
		} else {
			stop()
		}
	})

	const box3 = new Box3()

	$effect.pre(() => {
		if (selected.current) {
			box.visible = true

			if (selected.current.metadata.batched) {
				selected.current.metadata.getBoundingBoxAt?.(box3)
				console.log(box3)
				box.setFromBox3(box3)
			} else {
				const object3d = scene.getObjectByName(selected.current.name)
				if (object3d) {
					box.setFromObject(object3d)
				}
			}

			start()
		} else {
			box.visible = false
			stop()
		}
	})
</script>

<T is={box} />
