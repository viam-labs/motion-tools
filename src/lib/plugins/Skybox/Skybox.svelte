<script lang="ts">
	import { useThrelte } from '@threlte/core'
	import { EquirectangularReflectionMapping, type Texture, TextureLoader } from 'three'

	interface Props {
		url: string
		/**
		 * Euler rotation `[x, y, z]` in radians applied to `scene.backgroundRotation`.
		 * Default `[Math.PI / 2, 0, 0]` aligns a Y-up equirectangular image to this scene's
		 * Z-up convention; the Z component then acts as yaw around world +Z.
		 */
		rotation?: [x: number, y: number, z: number]
	}

	const { url, rotation = [Math.PI / 2, 0, 0] }: Props = $props()
	const { scene, invalidate } = useThrelte()

	$effect.pre(() => {
		const previous = scene.background
		let texture: Texture | undefined
		let cancelled = false

		new TextureLoader().load(url, (loaded) => {
			if (cancelled) {
				loaded.dispose()
				return
			}
			loaded.mapping = EquirectangularReflectionMapping
			texture = loaded
			scene.background = loaded
			invalidate()
		})

		return () => {
			cancelled = true
			if (texture && scene.background === texture) {
				scene.background = previous
				invalidate()
			}
			texture?.dispose()
		}
	})

	$effect.pre(() => {
		const previous = scene.backgroundRotation.clone()
		scene.backgroundRotation.set(...rotation)
		invalidate()

		return () => {
			scene.backgroundRotation.copy(previous)
			invalidate()
		}
	})
</script>
