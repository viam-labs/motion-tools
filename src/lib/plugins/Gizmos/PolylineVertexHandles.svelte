<script lang="ts">
	import type { Entity } from 'koota'

	import { T } from '@threlte/core'
	import { type IntersectionEvent, useCursor } from '@threlte/extras'
	import { Vector3 } from 'three'

	import { traits, useTrait } from '$lib/ecs'

	import { useSelectedPolylineVertex } from './useSelectedPolylineVertex.svelte'

	interface Props {
		entity: Entity
	}

	const { entity }: Props = $props()

	const linePositions = useTrait(() => entity, traits.LinePositions)
	const worldMatrix = useTrait(() => entity, traits.WorldMatrix)
	const vertex = useSelectedPolylineVertex()
	const cursor = useCursor()

	const positions = $derived.by<[number, number, number][]>(() => {
		const buf = linePositions.current
		if (!buf || buf.length < 3) return []
		const result: [number, number, number][] = []
		const p = new Vector3()
		for (let i = 0; i + 2 < buf.length; i += 3) {
			p.set(buf[i]!, buf[i + 1]!, buf[i + 2]!)
			if (worldMatrix.current) p.applyMatrix4(worldMatrix.current)
			result.push([p.x, p.y, p.z])
		}
		return result
	})

	const pick = (index: number) => (event: IntersectionEvent<MouseEvent>) => {
		event.stopPropagation()
		vertex.set({ entity, index })
	}

	const isSelected = (index: number) =>
		vertex.current?.entity === entity && vertex.current.index === index
</script>

{#each positions as position, index (index)}
	<T.Mesh
		{position}
		renderOrder={2}
		onpointerdown={pick(index)}
		onpointerenter={() => cursor.onPointerEnter()}
		onpointerleave={() => cursor.onPointerLeave()}
	>
		<T.SphereGeometry args={[0.015, 12, 12]} />
		<T.MeshBasicMaterial
			color={isSelected(index) ? '#3b82f6' : '#000000'}
			transparent
			opacity={isSelected(index) ? 1 : 0.6}
			depthTest={false}
		/>
	</T.Mesh>
{/each}
