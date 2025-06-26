<script lang="ts">
	import { Icon, type IconName, Tooltip } from '@viamrobotics/prime-core'

	interface Props {
		icon: IconName
		active?: boolean
		description: string
		hotkey: string
		class?: string
		onclick?: () => void
	}

	let {
		icon,
		active = false,
		description,
		hotkey,
		class: className = '',
		onclick,
	}: Props = $props()
</script>

<Tooltip
	let:tooltipID
	location="bottom"
>
	<label
		class={[
			className,
			'relative block border',
			active ? 'border-gray-5 text-gray-8 z-10 bg-white' : 'bg-light border-medium text-disabled',
		]}
		aria-describedby={tooltipID}
	>
		<button
			class="p-1.5"
			role="radio"
			aria-label={description}
			aria-checked={active}
			{onclick}
		>
			<Icon name={icon} />
		</button>
	</label>
	<p slot="description">
		{description} <span class="text-gray-5 pl-1">{hotkey}</span>
	</p>
</Tooltip>
