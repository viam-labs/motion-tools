<script lang="ts">
	import { T } from '@threlte/core'
	import { Points, BufferAttribute, BufferGeometry, Color, PointsMaterial } from 'three'
	import type { WorldObject } from '../WorldObject'
	import { useObjectEvents } from '../hooks/useObjectEvents.svelte'
	import { meshBounds } from '@threlte/extras'
	import { poseToObject3d } from '../transform'

	interface Props {
		object: WorldObject<{ case: 'points'; value: Float32Array }>
	}

	let { object }: Props = $props()

	const points = new Points()
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
		if (colors) {
			geometry.setAttribute('color', new BufferAttribute(new Float32Array(colors), 3))
		}
	})

	$effect.pre(() => {
		poseToObject3d(object.pose, points)
	})

	const events = useObjectEvents(() => object.uuid)
</script>

<T
	is={points}
	name={object.name}
	uuid={object.uuid}
	raycast={meshBounds}
	{...events}
>
	<T is={geometry} />
	<T is={material} />
</T>
