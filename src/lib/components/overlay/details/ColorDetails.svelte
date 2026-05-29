<script lang="ts">
	import type { Entity } from 'koota'

	import { Color, type ColorChangeEvent, type ColorValueRgbObject } from 'svelte-tweakpane-ui'

	import { traits, useTrait } from '$lib/ecs'

	interface Props {
		entity: Entity
	}

	let { entity }: Props = $props()

	const color = useTrait(() => entity, traits.Color)

	const handleColorChange = (event: ColorChangeEvent) => {
		if (event.detail.origin !== 'internal') return
		const next = event.detail.value as ColorValueRgbObject
		entity.set(traits.Color, { r: next.r, g: next.g, b: next.b })
	}
</script>

{#if color.current}
	<div>
		<strong class="font-semibold">color</strong>
		<Color
			value={color.current}
			type="float"
			on:change={handleColorChange}
		/>
	</div>
{/if}
