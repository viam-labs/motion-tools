<script lang="ts">
	import type { ClassValue, HTMLButtonAttributes, MouseEventHandler } from 'svelte/elements'

	import { Icon, type IconName, Tooltip } from '@viamrobotics/prime-core'
	import { Focus, MousePointer2, Ruler } from 'lucide-svelte'

	interface Props extends HTMLButtonAttributes {
		icon: IconName | 'ruler' | 'mouse-pointer' | 'focus'
		active?: boolean
		description: string
		hotkey?: string
		class?: ClassValue | null | undefined
		tooltipLocation?: 'bottom' | 'right' | 'left' | 'top'
		onclick?: MouseEventHandler<HTMLButtonElement> | null | undefined
	}

	let {
		icon,
		active = false,
		description,
		hotkey = '',
		class: className = '',
		tooltipLocation,
		onclick,
		...rest
	}: Props = $props()
</script>

<Tooltip
	let:tooltipID
	location={tooltipLocation ?? 'bottom'}
>
	<label
		class={[
			className,
			'relative block rounded-md border',
			active ? 'z-4 border-[#666] bg-[#666] text-white' : 'border-gray-5 text-gray-8 bg-white',
		]}
		aria-describedby={tooltipID}
	>
		<button
			class=" p-1.5"
			role="radio"
			aria-label={description}
			aria-checked={active}
			{onclick}
			{...rest}
		>
			{#if icon === 'ruler'}
				<Ruler size="16" />
			{:else if icon === 'mouse-pointer'}
				<MousePointer2 size="16" />
			{:else if icon === 'focus'}
				<Focus size="16" />
			{:else}
				<Icon name={icon} />
			{/if}
		</button>
	</label>
	<p slot="description">
		{description} <span class="text-gray-5 pl-1">{hotkey}</span>
	</p>
</Tooltip>
