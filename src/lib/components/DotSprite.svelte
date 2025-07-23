<script
	module
	lang="ts"
>
	const generateDotTexture = (size = 64) => {
		const canvas = document.createElement('canvas')
		canvas.width = canvas.height = size
		const ctx = canvas.getContext('2d')

		if (ctx) {
			// Transparent background
			ctx.clearRect(0, 0, size, size)

			// Draw a filled circle in the center
			ctx.beginPath()
			ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2)
			ctx.fillStyle = 'white'
			ctx.fill()
		}

		return canvas
	}
</script>

<script lang="ts">
	import { T, type Props as ThrelteProps } from '@threlte/core'
	import { CanvasTexture, SpriteMaterial, type Sprite, type ColorRepresentation } from 'three'

	interface Props extends ThrelteProps<typeof Sprite> {
		color?: ColorRepresentation
		opacity?: number
	}

	let { color, opacity = 1, ref = $bindable(), ...rest }: Props = $props()

	const material = new SpriteMaterial({
		map: new CanvasTexture(generateDotTexture()),
		transparent: true,
		color: 'black',
		depthTest: false,
	})

	$effect.pre(() => {
		if (color) {
			material.color.set(color)
		}
	})
</script>

<T.Sprite
	bind:ref
	scale={0.05}
	{...rest}
>
	<T
		is={material}
		{opacity}
	/>
</T.Sprite>
