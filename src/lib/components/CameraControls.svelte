<script
	module
	lang="ts"
>
	import {
		Box3,
		Matrix4,
		PerspectiveCamera,
		Quaternion,
		Raycaster,
		Sphere,
		Spherical,
		Vector2,
		Vector3,
		Vector4,
	} from 'three'
	import CameraController from 'camera-controls'
	import { T, useTask, useThrelte } from '@threlte/core'
	import type { Snippet } from 'svelte'

	let installed = false

	const install = () => {
		CameraController.install({
			THREE: {
				Box3,
				Matrix4,
				Quaternion,
				Raycaster,
				Sphere,
				Spherical,
				Vector2,
				Vector3,
				Vector4,
			},
		})
		installed = true
	}
</script>

<script lang="ts">
	interface Props {
		ref?: CameraController
		enabled?: boolean
		children?: Snippet<[{ ref: CameraController }]>
	}

	let { ref = $bindable(), enabled = true, children }: Props = $props()

	if (!installed) {
		install()
	}

	const { camera, dom, invalidate } = useThrelte()

	const controls = new CameraController(camera.current as PerspectiveCamera, dom)

	$effect.pre(() => {
		controls.camera = $camera as PerspectiveCamera
	})

	$effect.pre(() => {
		controls.enabled = enabled
	})

	useTask(
		(delta) => {
			if (controls.update(delta)) {
				invalidate()
			}
		},
		{ autoInvalidate: false }
	)
</script>

<T
	is={controls}
	bind:ref
>
	{@render children?.({ ref: controls })}
</T>
