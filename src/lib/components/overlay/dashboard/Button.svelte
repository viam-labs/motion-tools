<script lang="ts">
	import type { ClassValue, HTMLButtonAttributes, MouseEventHandler } from 'svelte/elements'

	import { Icon, type IconName, Tooltip } from '@viamrobotics/prime-core'
	import { Focus, MousePointer2, Ruler, Shapes } from 'lucide-svelte'

	interface Props extends HTMLButtonAttributes {
		icon: IconName | 'ruler' | 'mouse-pointer' | 'shapes' | 'focus'
		iconCx?: string
		active?: boolean
		description: string
		hotkey?: string
		class?: ClassValue | null | undefined
		tooltipLocation?: 'bottom' | 'right' | 'left' | 'top'
		disableTooltip?: boolean
		onclick?: MouseEventHandler<HTMLButtonElement> | null | undefined
	}

	let {
		icon,
		iconCx,
		active = false,
		description,
		hotkey = '',
		class: className = '',
		tooltipLocation,
		disableTooltip = false,
		onclick,
		...rest
	}: Props = $props()
</script>

<Tooltip
	let:tooltipID
	location={tooltipLocation ?? 'bottom'}
	state={disableTooltip ? 'invisible' : undefined}
>
	<label
		class={[
			className,
			'relative block rounded-md border active:z-4 active:border-[#666] active:bg-[#666] active:text-white',
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
			{:else if icon === 'shapes'}
				<Shapes size="16" />
			{:else if icon === 'focus'}
				<Focus size="16" />
			{:else}
				<Icon
					name={icon}
					cx={iconCx}
				/>
			{/if}
		</button>
	</label>
	<p slot="description">
		{description} <span class="text-gray-5 pl-1">{hotkey}</span>
	</p>
</Tooltip>
