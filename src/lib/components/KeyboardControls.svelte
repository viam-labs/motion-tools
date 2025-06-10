<script lang="ts">
	import { MathUtils } from 'three'
	import { useTask } from '@threlte/core'
	import type CameraController from 'camera-controls'
	import { PressedKeys } from 'runed'

	interface Props {
		cameraControls: CameraController
	}

	let { cameraControls }: Props = $props()

	const keys = new PressedKeys()
	const w = $derived(keys.has('w'))
	const s = $derived(keys.has('s'))
	const a = $derived(keys.has('a'))
	const d = $derived(keys.has('d'))
	const up = $derived(keys.has('arrowup'))
	const left = $derived(keys.has('arrowleft'))
	const down = $derived(keys.has('arrowdown'))
	const right = $derived(keys.has('arrowright'))
	const any = $derived(keys.all.length > 0)

	const { start, stop } = useTask(
		(delta) => {
			const dt = delta * 1000

			if (a) {
				cameraControls.truck(-0.01 * dt, 0, true)
			}

			if (d) {
				cameraControls.truck(0.01 * dt, 0, true)
			}

			if (w) {
				cameraControls.forward(0.01 * dt, true)
			}

			if (s) {
				cameraControls.forward(-0.01 * dt, true)
			}

			if (left) {
				cameraControls.rotate(-0.1 * MathUtils.DEG2RAD * dt, 0, true)
			}

			if (right) {
				cameraControls.rotate(0.1 * MathUtils.DEG2RAD * dt, 0, true)
			}

			if (up) {
				cameraControls.rotate(0, -0.05 * MathUtils.DEG2RAD * dt, true)
			}

			if (down) {
				cameraControls.rotate(0, 0.05 * MathUtils.DEG2RAD * dt, true)
			}
		},
		{ autoStart: false, autoInvalidate: false }
	)

	$effect.pre(() => {
		if (any) {
			start()
		} else {
			stop()
		}
	})
</script>
