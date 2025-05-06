<script lang="ts">
	import { Label, Select } from '@viamrobotics/prime-core'
	import { useRefreshRates } from '$lib/hooks/useRefreshRates.svelte'

	interface Props {
		name: string
	}

	let { name }: Props = $props()

	const pollingRates = useRefreshRates()
	const rate = $derived(pollingRates.get(name))
</script>

<div>
	<label class="flex flex-col gap-1">
		{name}
		<Select
			onchange={(event: InputEvent) => {
				if (event.target instanceof HTMLSelectElement) {
					const { value } = event.target

					if (value === '') {
						pollingRates.delete(name)
						return
					}

					pollingRates.set(name, Number.parseInt(value, 10))
				}
			}}
			value={String(rate ?? '')}
		>
			<option value="-1">Do not fetch</option>
			<option value="">Do not refresh</option>
			<option value="1000">Refresh every second</option>
			<option value="1000">Refresh every 2 seconds</option>
			<option value="5000">Refresh every 5 seconds</option>
			<option value="10000">Refresh every 10 seconds</option>
			<option value="30000">Refresh every 30 seconds</option>
		</Select>
	</label>
</div>
