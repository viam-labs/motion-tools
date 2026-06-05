<script lang="ts">
	import type { Entity } from 'koota'

	import { HTML } from '@threlte/extras'
	import { untrack } from 'svelte'

	import { traits, useTag, useTrait } from '$lib/ecs'
	import { useSettings } from '$lib/hooks/useSettings.svelte'

	import { labels } from './labelLayout/labelStore.svelte'

	interface Props {
		entity: Entity
	}

	let { entity }: Props = $props()

	const name = useTrait(() => entity, traits.Name)
	const color = useTrait(() => entity, traits.Color)
	const selected = useTag(() => entity, traits.Selected)

	const settings = useSettings()

	const enabled = $derived(settings.current.enableLabels)

	let element = $state.raw<HTMLElement>()

	$effect(() => {
		const el = element

		if (!el) return

		return untrack(() => {
			labels.add(el)
			return () => labels.remove(el)
		})
	})

	// Re-measure when the label text changes (its width drives slot geometry).
	$effect(() => {
		if (name.current) {
			untrack(() => labels.touch())
		}
	})
</script>

{#if enabled}
	<HTML
		center
		zIndexRange={[3, 0]}
	>
		<div
			class="label relative h-0 w-0"
			bind:this={element}
		>
			<svg class="link pointer-events-none absolute top-0 left-0 overflow-visible">
				<line class="stroke-gray-9 stroke-1" />
			</svg>
			<div
				class="dot border-gray-9 pointer-events-none absolute -top-1 -left-0 z-1 h-2 w-2 -translate-1/2 rounded-full border"
			></div>
			<button
				class={[
					'border-gray-9 text absolute z-2 border px-2 py-1 text-xs text-nowrap',
					{
						'bg-gray-9 text-white': selected.current,
						'bg-white': !selected.current,
					},
				]}
				style={color.current
					? `border-color-left: rgb(${color.current.r}, ${color.current.g}, ${color.current.b})`
					: undefined}
				onclick={() => {
					entity.add(traits.Selected)
				}}
			>
				{name.current}
			</button>
		</div>
	</HTML>
{/if}
