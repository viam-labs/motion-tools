<script lang="ts">
	import type { Snippet } from 'svelte'

	import { normalizeProps, useMachine } from '@zag-js/svelte'
	import * as tabs from '@zag-js/tabs'

	interface Props {
		items: { label: string; content: Snippet }[]
		defaultTab?: string
		onValueChange?: (value: string) => void
	}

	const { items, defaultTab, onValueChange }: Props = $props()

	const id = $props.id()
	const service = useMachine(tabs.machine, () => ({
		id,
		defaultValue: defaultTab ?? items[0]?.label,
		onValueChange: (details) => onValueChange?.(details.value),
	}))

	const api = $derived(tabs.connect(service, normalizeProps))
</script>

<div
	{...api.getRootProps()}
	class="flex h-full flex-col gap-2 overflow-hidden"
>
	<div
		{...api.getListProps()}
		class="border-light flex shrink-0 flex-row items-center gap-1 border-b text-sm"
	>
		{#each items as item (item.label)}
			<button
				{...api.getTriggerProps({ value: item.label })}
				class={[
					'text-subtle-1 hover:text-default border-b-2 border-transparent px-3 py-1.5 transition-colors',
					{ 'text-default border-dark': api.value === item.label },
				]}
			>
				{item.label}
			</button>
		{/each}
	</div>

	{#each items as item (item.label)}
		<div
			{...api.getContentProps({ value: item.label })}
			class="min-h-0 w-full flex-1 overflow-y-auto p-1"
		>
			{@render item.content()}
		</div>
	{/each}
</div>
