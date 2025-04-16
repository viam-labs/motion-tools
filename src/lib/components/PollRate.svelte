<script lang="ts">
	import { useResourceNames } from '@viamrobotics/svelte-sdk'
	import { usePartID } from '$lib/hooks/usePartID.svelte'
	import { usePollingRates } from '$lib/hooks/usePollingRates.svelte'

	interface Props {
		id: string
	}

	let { id }: Props = $props()

	const pollingRates = usePollingRates()
	const partID = usePartID()

	const cameras = useResourceNames(() => partID.current, 'camera')

	const rate = $derived(pollingRates.get(id))
</script>

<div>
	<label>
		poll rate
		<select
			onchange={(event) => {
				if (event.target instanceof HTMLSelectElement) {
					const { value } = event.target

					if (value === 'Infinity') {
						pollingRates.delete(id)
					}

					pollingRates.set(id, Number.parseInt(value, 10))
				}
			}}
			value={rate}
		>
			<option value="Infinity">Off</option>
			<option value="1000">1 Second</option>
			<option value="5000">5 Seconds</option>
			<option value="10000">10000</option>
		</select>
	</label>
</div>
