<script lang="ts">
	import { Label, Select } from '@viamrobotics/prime-core'

	import Table from '$lib/components/overlay/Table.svelte'
	import { formatNumeric } from '$lib/format'
	import { useArmClient } from '$lib/hooks/useArmClient.svelte'
	import { useSettings } from '$lib/hooks/useSettings.svelte'

	import FloatingPanel from '../FloatingPanel.svelte'

	const armClient = useArmClient()
	const settings = useSettings()

	let isOpen = $state(true)
	let selectedArm = $state(armClient.names[0])

	const positions = $derived(armClient.currentPositions[selectedArm])

	// Sync panel close back to settings
	$effect(() => {
		if (isOpen) return
		settings.current.enableArmPositionsWidget = false
	})
</script>

<FloatingPanel
	title="Arm positions"
	bind:isOpen
	defaultSize={{ width: 280, height: 300 }}
>
	<div class="flex flex-col gap-2 overflow-y-auto p-2 text-xs">
		<Label>
			Select arm
			<Select
				slot="input"
				value={selectedArm}
				name="arm"
				on:change={(event) => {
					selectedArm = (event.target as HTMLSelectElement).value
				}}
			>
				{#each armClient.names as name (name)}
					<option value={name}>{name}</option>
				{/each}
			</Select>
		</Label>
		<Table>
			<thead>
				<tr>
					<th> Joint </th>
					<th>Position (degrees)</th>
				</tr>
			</thead>
			<tbody>
				{#if positions}
					{#each positions as position, index ([position, index])}
						<tr>
							<th> {index} </th>
							<th> {formatNumeric(position)} </th>
						</tr>
					{/each}
				{:else}
					<tr>
						<th colspan="2"> No positions </th>
					</tr>
				{/if}
			</tbody>
		</Table>
	</div>
</FloatingPanel>
