<script
	module
	lang="ts"
>
	import { T, type Props as ThrelteProps } from '@threlte/core'
	import { CanvasTexture, type Sprite, type ColorRepresentation } from 'three'

	const size = 128
	const canvas = new OffscreenCanvas(size, size)
	const ctx = canvas.getContext('2d')

	if (ctx) {
		ctx.clearRect(0, 0, size, size)
		ctx.beginPath()
		ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2)
		ctx.fillStyle = 'white'
		ctx.fill()
	}

	const map = new CanvasTexture(canvas)
</script>

<script lang="ts">
	interface Props extends ThrelteProps<typeof Sprite> {
		color?: ColorRepresentation
		opacity?: number
	}

	let { color, opacity = 1, ref = $bindable(), ...rest }: Props = $props()
</script>

<T.Sprite
	bind:ref
	scale={0.05}
	{...rest}
>
	<T.SpriteMaterial
		transparent
		depthTest={false}
		{map}
		{opacity}
		color={color ?? 'black'}
	/>
</T.Sprite>
