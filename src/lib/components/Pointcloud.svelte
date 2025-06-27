<script lang="ts">
	import { Points, BufferAttribute, BufferGeometry, PointsMaterial } from 'three'

	import { T } from '@threlte/core'
	import type { WorldObject } from '$lib/WorldObject'
	import { useObjectEvents } from '$lib/hooks/useObjectEvents.svelte'
	import { meshBounds } from '@threlte/extras'
	import { poseToObject3d } from '$lib/transform'

	interface Props {
		object: WorldObject<{ case: 'points'; value: Float32Array<ArrayBuffer> }>
	}

	let { object }: Props = $props()

	const points = new Points()
	const geometry = new BufferGeometry()
	const material = new PointsMaterial({
		color: object.metadata.color ?? '#888888',
		size: object.metadata.pointSize ?? 0.01,
	})

	const colors = $derived(object.metadata.colors)
	const positions = $derived(object.geometry?.value ?? new Float32Array())

	$effect.pre(() => {
		material.color.set(object.metadata.color ?? '#888888')
		material.size = object.metadata.pointSize ?? 0.01
	})

	$effect.pre(() => {
		material.vertexColors = colors !== undefined
	})

	$effect.pre(() => {
		geometry.setAttribute('position', new BufferAttribute(positions, 3))
	})

	$effect.pre(() => {
		if (colors) {
			geometry.setAttribute('color', new BufferAttribute(colors, 3))
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
