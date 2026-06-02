<script lang="ts">
	import type { Entity } from 'koota'

	import { useThrelte } from '@threlte/core'
	import { Slider, type SliderChangeEvent } from 'svelte-tweakpane-ui'

	import { traits, useTrait } from '$lib/ecs'

	interface Props {
		entity: Entity
	}

	const { entity }: Props = $props()

	const { invalidate } = useThrelte()

	const opacity = useTrait(() => entity, traits.Opacity)
	const opacityValue = $derived(opacity.current ?? 0.7)

	const handleOpacityChange = (event: SliderChangeEvent) => {
		if (event.detail.origin !== 'internal') return
		const next = event.detail.value
		if (entity.has(traits.Opacity)) {
			entity.set(traits.Opacity, next)
		} else {
			entity.add(traits.Opacity(next))
		}
		invalidate()
	}
</script>

<div>
	<strong class="font-semibold">opacity</strong>
	<div aria-label="mutable opacity">
		<Slider
			value={opacityValue}
			min={0}
			max={1}
			step={0.01}
			format={(v) => v.toFixed(2)}
			on:change={handleOpacityChange}
		/>
	</div>
</div>
