<script lang="ts">
	import { Button } from '@viamrobotics/prime-core'

	import { DashboardPortal } from '$lib'
	import DashboardButton from '$lib/components/overlay/dashboard/Button.svelte'
	import FloatingPanel from '$lib/components/overlay/FloatingPanel.svelte'
	import { usePartID } from '$lib/hooks/usePartID.svelte'

	import { useFramelessComponents } from './useFramelessComponents.svelte'
	import { usePartConfig } from './usePartConfig.svelte'

	const partID = usePartID()
	const framelessComponents = useFramelessComponents()
	const partConfig = usePartConfig()

	let selectedComponent = $derived(framelessComponents.current[0] ?? '')

	let isOpen = $state(false)
</script>

{#if partID.current && partConfig.hasEditPermissions}
	<DashboardPortal>
		<fieldset>
			<DashboardButton
				active={isOpen}
				icon="axis-arrow"
				description="Add frames"
				onclick={() => {
					isOpen = !isOpen
				}}
			/>
		</fieldset>
	</DashboardPortal>

	<FloatingPanel
		{isOpen}
		defaultSize={{ width: 300, height: 150 }}
	>
		<div class="flex h-full flex-col items-center justify-center gap-2 overflow-auto p-3 text-xs">
			{#if framelessComponents.current.length > 0}
				<select
					class="border-light hover:border-gray-6 focus:border-gray-9 h-7.5 w-full appearance-none border bg-white px-2 py-1.5 text-xs leading-tight"
					bind:value={selectedComponent}
				>
					{#each framelessComponents.current as component (component)}
						<option>{component}</option>
					{/each}
				</select>

				<Button
					icon="plus"
					onclick={() => {
						partConfig.createFrame(selectedComponent)
						isOpen = false
					}}
				>
					Add frame
				</Button>
			{:else}
				<p class="text-center">No components without frames</p>
			{/if}
		</div>
	</FloatingPanel>
{/if}
