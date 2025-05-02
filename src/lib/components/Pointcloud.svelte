<script lang="ts">
	import { T } from '@threlte/core'
	import { BufferAttribute, BufferGeometry, Color, PointsMaterial } from 'three'
	import type { WorldObject } from '$lib/WorldObject'

	interface Props {
		object: WorldObject<{ case: 'points'; value: Float32Array }>
	}

	let { object }: Props = $props()

	const geometry = new BufferGeometry()
	const material = new PointsMaterial({
		size: 0.01,

		color: new Color('#888888'),
	})

	const colors = $derived(object.metadata.colors)
	const positions = $derived(object.geometry?.value ?? [])

	$effect(() => {
		material.vertexColors = colors !== undefined
	})

	$effect.pre(() => {
		geometry.setAttribute('position', new BufferAttribute(new Float32Array(positions), 3))
	})

	$effect.pre(() => {
		geometry.setAttribute('color', new BufferAttribute(new Float32Array(colors), 3))
	})
</script>

<T.Points>
	<T is={geometry} />
	<T is={material} />
</T.Points>
