<script lang="ts">
	import type { Entity } from 'koota'

	import { useThrelte } from '@threlte/core'
	import { Point, type PointChangeEvent, type PointValue2dObject } from 'svelte-tweakpane-ui'

	import { useTrait } from '$lib/ecs'

	import { ReferencePlane } from './traits'

	interface Props {
		entity: Entity
	}

	const { entity }: Props = $props()

	const { invalidate } = useThrelte()
	const plane = useTrait(() => entity, ReferencePlane)

	const handleChange = (event: PointChangeEvent) => {
		if (event.detail.origin !== 'internal') return
		const next = event.detail.value as PointValue2dObject
		entity.set(ReferencePlane, { width: next.x, height: next.y })
		invalidate()
	}
</script>

{#if plane.current}
	<div>
		<strong class="font-semibold">dimensions</strong>
		<span class="text-subtle-2">(plane) (mm)</span>
		<div aria-label="mutable plane dimensions">
			<Point
				value={{ x: plane.current.width, y: plane.current.height }}
				min={0}
				on:change={handleChange}
			/>
		</div>
	</div>
{/if}
