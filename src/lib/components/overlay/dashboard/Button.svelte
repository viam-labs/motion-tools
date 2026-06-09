<script lang="ts">
	import type { ClassValue, HTMLButtonAttributes, MouseEventHandler } from 'svelte/elements'

	import { Icon, type IconName, Tooltip } from '@viamrobotics/prime-core'
	import { Focus, Moon, MousePointer2, Ruler, Shapes, Sun, SunMoon } from 'lucide-svelte'

	interface Props extends HTMLButtonAttributes {
		icon: IconName | 'ruler' | 'mouse-pointer' | 'shapes' | 'focus' | 'sun-moon' | 'sun' | 'moon'
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
			'active:border-gray-8 active:bg-gray-8 relative block rounded-md border active:z-4 active:text-white',
			active ? 'border-gray-8 bg-gray-8 z-4 text-white' : 'border-gray-5 text-gray-8 bg-light',
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
			{:else if icon === 'sun-moon'}
				<SunMoon size="16" />
			{:else if icon === 'sun'}
				<Sun size="16" />
			{:else if icon === 'moon'}
				<Moon size="16" />
			{:else}
				<Icon name={icon} />
			{/if}
		</button>
	</label>
	<p slot="description">
		{description} <span class="text-gray-5 pl-1">{hotkey}</span>
	</p>
</Tooltip>
