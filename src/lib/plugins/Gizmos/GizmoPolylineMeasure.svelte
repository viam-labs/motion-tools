<script lang="ts">
	import type { Entity } from 'koota'

	import { HTML } from '@threlte/extras'
	import { Vector3 } from 'three'

	import { traits, useTrait } from '$lib/ecs'

	import { PolylineMeasure } from './traits'

	interface Props {
		entity: Entity
	}

	const { entity }: Props = $props()

	const positions = useTrait(() => entity, traits.LinePositions)
	const worldMatrix = useTrait(() => entity, traits.WorldMatrix)
	const measure = useTrait(() => entity, PolylineMeasure)

	const points = $derived.by(() => {
		if (!positions.current || positions.current.length < 6) return []

		const result = []
		for (let i = 0; i + 2 < positions.current.length; i += 3) {
			const point = new Vector3(
				positions.current[i],
				positions.current[i + 1],
				positions.current[i + 2]
			)

			if (worldMatrix.current) point.applyMatrix4(worldMatrix.current)
			result.push(point)
		}

		return result
	})

	const segments = $derived.by(() => {
		if (measure.current?.mode !== 'segment') return []

		const result = []
		for (let i = 0; i + 1 < points.length; i++) {
			const a = points[i]
			const b = points[i + 1]
			const distance = a.distanceTo(b)
			if (distance === 0) continue
			result.push({ mid: new Vector3().lerpVectors(a, b, 0.5), distance })
		}

		return result
	})

	const total = $derived.by(() => {
		if (measure.current?.mode !== 'total') return undefined
		if (points.length < 2) return undefined

		let distance = 0
		for (let i = 0; i + 1 < points.length; i++) distance += points[i].distanceTo(points[i + 1])
		if (distance === 0) return undefined

		const last = points.length - 1
		const closed = points[0].distanceToSquared(points[last]) < 1e-12
		const sampleCount = closed ? last : points.length
		const position = new Vector3()
		for (let i = 0; i < sampleCount; i++) position.add(points[i])
		position.divideScalar(sampleCount)
		return { position, distance }
	})
</script>

{#each segments as { mid, distance }, i (i)}
	<HTML
		center
		position={mid.toArray()}
		zIndexRange={[3, 0]}
	>
		<div class="pointer-events-none border border-black bg-white px-1 py-0.5 text-xs">
			{distance.toFixed(3)}<span class="text-subtle-2">m</span>
		</div>
	</HTML>
{/each}

{#if total}
	<HTML
		center
		position={total.position.toArray()}
		zIndexRange={[3, 0]}
	>
		<div class="pointer-events-none border border-black bg-white px-1 py-0.5 text-xs font-bold">
			{total.distance.toFixed(3)}<span class="text-subtle-2">m</span>
		</div>
	</HTML>
{/if}
