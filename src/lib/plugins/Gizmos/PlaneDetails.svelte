<script lang="ts">
	import type { Entity } from 'koota'

	import { useThrelte } from '@threlte/core'
	import { Slider, type SliderChangeEvent } from 'svelte-tweakpane-ui'

	import { useTrait } from '$lib/ecs'

	import { Plane } from './traits'

	interface Props {
		entity: Entity
	}

	const { entity }: Props = $props()

	const { invalidate } = useThrelte()
	const plane = useTrait(() => entity, Plane)

	const handleWidthChange = (event: SliderChangeEvent) => {
		if (event.detail.origin !== 'internal') return
		const current = plane.current
		if (!current) return
		entity.set(Plane, { width: event.detail.value, height: current.height })
		invalidate()
	}

	const handleHeightChange = (event: SliderChangeEvent) => {
		if (event.detail.origin !== 'internal') return
		const current = plane.current
		if (!current) return
		entity.set(Plane, { width: current.width, height: event.detail.value })
		invalidate()
	}
</script>

{#if plane.current}
	<div>
		<strong class="font-semibold">dimensions</strong>
		<span class="text-subtle-2">(plane) (mm)</span>
		<div aria-label="mutable plane dimensions">
			<Slider
				label="w"
				value={plane.current.width}
				min={0}
				on:change={handleWidthChange}
			/>
			<Slider
				label="h"
				value={plane.current.height}
				min={0}
				on:change={handleHeightChange}
			/>
		</div>
	</div>
{/if}
