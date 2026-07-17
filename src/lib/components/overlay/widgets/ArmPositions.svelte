<script lang="ts">
	import Table from '$lib/components/overlay/Table.svelte'
	import { formatNumeric } from '$lib/format'
	import { useArmClient } from '$lib/hooks/useArmClient.svelte'
	import { usePartID } from '$lib/hooks/usePartID.svelte'
	import { useSettings } from '$lib/hooks/useSettings.svelte'

	import FloatingPanel from '../FloatingPanel.svelte'

	const { name } = $props<{ name: string }>()

	const settings = useSettings()
	const partID = usePartID()
	const armClient = useArmClient()

	let isOpen = $state(true)

	const positions = $derived(armClient.currentPositions[name])

	// Sync panel close back to settings
	$effect(() => {
		if (isOpen) return
		const list = settings.current.openArmWidgets[partID.current] ?? []
		const next = list.filter((widget) => widget !== name)
		if (next.length === list.length) return
		settings.current.openArmWidgets = {
			...settings.current.openArmWidgets,
			[partID.current]: next,
		}
	})
</script>

<FloatingPanel
	title={name}
	bind:isOpen
	defaultSize={{ width: 280, height: 300 }}
>
	<div class="flex h-full flex-col gap-2 overflow-y-auto p-2 text-xs">
		<Table>
			<thead>
				<tr>
					<th> Joint </th>
					<th>Position (degrees)</th>
				</tr>
			</thead>
			<tbody>
				{#if positions}
					{#each positions as position, index (index)}
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
