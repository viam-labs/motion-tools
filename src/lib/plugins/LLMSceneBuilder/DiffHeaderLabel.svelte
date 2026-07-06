<script lang="ts">
	import type { ClassValue } from 'svelte/elements'

	import { TooltipContainer, TooltipTarget, TooltipText } from '@viamrobotics/prime-core'
	import { useResizeObserver } from 'runed'

	interface Props {
		text: string
		tooltipText?: string
		class?: ClassValue
		containerClass?: ClassValue
	}

	let { text, tooltipText, class: textClass = '', containerClass = '' }: Props = $props()

	let showTooltip = $state(false)
	let element = $state<HTMLElement | null>(null)

	useResizeObserver(
		() => element,
		() => {
			if (!element) {
				return
			}
			showTooltip = text.length > 0 && element.offsetWidth < element.scrollWidth
		}
	)
</script>

<div class={['min-w-0', containerClass]}>
	<TooltipContainer hoverDelayMS={250}>
		<TooltipTarget>
			<span
				bind:this={element}
				class={['block w-full truncate', textClass]}
				aria-label={tooltipText ?? text}
			>
				{text}
			</span>
		</TooltipTarget>

		{#if showTooltip}
			<TooltipText location="top-start">
				{tooltipText ?? text}
			</TooltipText>
		{/if}
	</TooltipContainer>
</div>
