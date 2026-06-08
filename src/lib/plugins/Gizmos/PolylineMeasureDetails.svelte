<script lang="ts">
	import type { Entity } from 'koota'

	import { List, type ListChangeEvent } from 'svelte-tweakpane-ui'

	import { useTrait } from '$lib/ecs'

	import { PolylineMeasure, type PolylineMeasureMode } from './traits'

	type Selection = 'none' | PolylineMeasureMode

	const options = [
		{ value: 'none', text: 'Off' },
		{ value: 'segment', text: 'Per segment' },
		{ value: 'total', text: 'Total length' },
	] satisfies { value: Selection; text: string }[]

	interface Props {
		entity: Entity
	}

	const { entity }: Props = $props()

	const measure = useTrait(() => entity, PolylineMeasure)

	const selection = $derived<Selection>(measure.current?.mode ?? 'none')

	const onChange = (event: ListChangeEvent) => {
		if (event.detail.origin !== 'internal') return
		const value = event.detail.value as Selection
		if (value === 'none') {
			if (entity.has(PolylineMeasure)) entity.remove(PolylineMeasure)
			return
		}
		const mode = value as PolylineMeasureMode
		if (entity.has(PolylineMeasure)) entity.set(PolylineMeasure, { mode })
		else entity.add(PolylineMeasure({ mode }))
	}
</script>

<div>
	<strong class="font-semibold">measurement</strong>
	<List
		value={selection}
		{options}
		on:change={onChange}
	/>
</div>
