<script lang="ts">
	import { draggable } from '@neodrag/svelte'
	import { Icon } from '@viamrobotics/prime-core'

	import Table from '$lib/components/overlay/Table.svelte'
	import { formatNumeric } from '$lib/format'
	import { useArmClient } from '$lib/hooks/useArmClient.svelte'
	import { usePartID } from '$lib/hooks/usePartID.svelte'
	import { useSettings } from '$lib/hooks/useSettings.svelte'

	const { name, ...rest } = $props<{ name: string }>()

	let dragElement = $state.raw<HTMLElement>()

	const settings = useSettings()
	const partID = usePartID()
	const armClient = useArmClient()

	const positions = $derived(armClient.currentPositions[name])
</script>

<div
	class="bg-extralight border-medium absolute top-0 left-0 z-4 m-2 overflow-y-auto border text-xs"
	use:draggable={{
		bounds: 'body',
		handle: dragElement,
	}}
	{...rest}
>
	<div class="flex min-w-0 flex-col">
		<div class="flex w-full items-center justify-between">
			<div class="border-medium flex w-full items-center gap-1 border-b p-2">
				<button bind:this={dragElement}>
					<Icon name="drag" />
				</button>
				<h3 class="min-w-0 truncate">{name}</h3>
				<div class="flex-1"></div>
				<button
					aria-label="close"
					class="hover:text-default"
					onclick={() => {
						const widgets = settings.current.openArmWidgets[partID.current] || []
						settings.current.openArmWidgets = {
							...settings.current.openArmWidgets,
							[partID.current]: widgets.filter((widget) => widget !== name),
						}
					}}
				>
					<Icon
						name="close"
						size="xs"
					/>
				</button>
			</div>
		</div>

		<div class="flex flex-col gap-2 p-2">
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
	</div>
</div>
