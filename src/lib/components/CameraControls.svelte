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
	import CameraControls from 'camera-controls'
	import { T, useTask, useThrelte } from '@threlte/core'
	import type { Snippet } from 'svelte'

	let installed = false

	const install = () => {
		CameraControls.install({
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
		ref: CameraControls
		children?: Snippet
	}

	let { ref = $bindable(), children }: Props = $props()

	if (!installed) install()

	const { camera, dom, invalidate } = useThrelte()

	ref = new CameraControls(camera.current as PerspectiveCamera, dom)

	$effect.pre(() => {
		ref.camera = $camera as PerspectiveCamera
	})

	useTask(
		(delta) => {
			if (ref.update(delta)) {
				invalidate()
			}
		},
		{ autoInvalidate: false }
	)
</script>

<T is={ref}>
	{@render children?.()}
</T>
