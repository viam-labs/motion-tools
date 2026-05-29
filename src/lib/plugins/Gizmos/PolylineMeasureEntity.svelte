<script lang="ts">
	import type { Entity } from 'koota'

	import { HTML } from '@threlte/extras'
	import { Vector3 } from 'three'

	import { traits, useTrait } from '$lib/ecs'

	import { PolylineMeasure } from './traits'

	interface Props {
		entity: Entity
	}

	let { entity }: Props = $props()

	const positions = useTrait(() => entity, traits.LinePositions)
	const worldMatrix = useTrait(() => entity, traits.WorldMatrix)
	const measure = useTrait(() => entity, PolylineMeasure)

	const points = $derived.by<Vector3[]>(() => {
		const arr = positions.current
		const wm = worldMatrix.current
		if (!arr || arr.length < 6) return []

		const result: Vector3[] = []
		for (let i = 0; i + 2 < arr.length; i += 3) {
			const point = new Vector3(arr[i], arr[i + 1], arr[i + 2])
			if (wm) point.applyMatrix4(wm)
			result.push(point)
		}
		return result
	})

	const segments = $derived.by<{ mid: Vector3; distance: number }[]>(() => {
		if (measure.current?.mode !== 'segment') return []

		const segs: { mid: Vector3; distance: number }[] = []
		for (let i = 0; i + 1 < points.length; i++) {
			const a = points[i]
			const b = points[i + 1]
			const distance = a.distanceTo(b)
			if (distance === 0) continue
			segs.push({ mid: new Vector3().lerpVectors(a, b, 0.5), distance })
		}
		return segs
	})

	const total = $derived.by<{ position: Vector3; distance: number } | undefined>(() => {
		if (measure.current?.mode !== 'total') return undefined
		if (points.length < 2) return undefined

		let distance = 0
		for (let i = 0; i + 1 < points.length; i++) {
			distance += points[i].distanceTo(points[i + 1])
		}
		if (distance === 0) return undefined

		const position = new Vector3()
		for (const p of points) position.add(p)
		position.divideScalar(points.length)
		return { position, distance }
	})
</script>

{#each segments as { mid, distance } (mid.toArray().join(','))}
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
