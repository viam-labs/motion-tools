<script lang="ts">
	import { Select } from '@viamrobotics/prime-core'
	import { useRefreshRates } from '$lib/hooks/useRefreshRates.svelte'
	import type { Snippet } from 'svelte'

	interface Props {
		name: string
		children?: Snippet
	}

	let { name, children }: Props = $props()

	const pollingRates = useRefreshRates()
	const rate = $derived(pollingRates.get(name))
</script>

<label class="flex flex-col gap-1">
	{name}
	<Select
		onchange={(event: InputEvent) => {
			if (event.target instanceof HTMLSelectElement) {
				const { value } = event.target
				pollingRates.set(name, Number.parseInt(value, 10))
			}
		}}
		value={String(rate ?? '')}
	>
		{#if children}
			{@render children()}
		{:else}
			<option value="-1">Do not fetch</option>
			<option value="0">Do not refresh</option>
			<option value="500">Refresh every 0.5 second</option>
			<option value="1000">Refresh every second</option>
			<option value="2000">Refresh every 2 seconds</option>
			<option value="5000">Refresh every 5 seconds</option>
			<option value="10000">Refresh every 10 seconds</option>
			<option value="30000">Refresh every 30 seconds</option>
		{/if}
	</Select>
</label>

<style>
	label :global svg {
		display: none;
	}
</style>
