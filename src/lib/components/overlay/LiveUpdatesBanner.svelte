<script lang="ts">
	import { Button, Icon } from '@viamrobotics/prime-core'

	import { useWorld } from '$lib/ecs'
	import { resetStagedEdits } from '$lib/editing/resetStagedEdits'
	import { useEnvironment } from '$lib/hooks/useEnvironment.svelte'
	import { usePartConfig } from '$lib/hooks/usePartConfig.svelte'

	const environment = useEnvironment()
	const partConfig = usePartConfig()
	const world = useWorld()

	const { ...rest } = $props()

	const discard = () => {
		partConfig.discardChanges()
		resetStagedEdits(world)
	}

	const isMacDevice = /Mac|iPod|iPhone|iPad/.test(navigator.platform)
	const iconName = isMacDevice ? ('apple-keyboard-command' as const) : ('chevron-up' as const)
	const iconLabel = isMacDevice ? 'command' : 'control'
</script>

<svelte:window
	onkeydowncapture={(event) => {
		if (event.metaKey && event.key.toLowerCase() === 's') {
			event.preventDefault()
			event.stopImmediatePropagation()
			partConfig.save()
		}
	}}
/>

{#if environment.current.viewerMode === 'build'}
	<div
		class="absolute bottom-4 z-4 flex w-full justify-center gap-2"
		{...rest}
	>
		<div
			class="flex items-center gap-8 rounded border-l-4 border-yellow-600 bg-yellow-50 px-4 py-2 shadow-2xl"
		>
			<div class="flex flex-col">
				<p class="text-sm">
					<strong>Live updates paused</strong>
				</p>

				<p class="text-subtle-2 text-sm">You are viewing a snapshot while editing.</p>
			</div>

			{#if environment.current.isStandalone}
				<div class="flex gap-2">
					<Button
						class="cursor-pointer text-blue-600"
						onclick={discard}
					<Button
						onclick={discard}
						disabled={!partConfig.isDirty}
					>
					>
						Discard
					</Button>

					<Button
						variant="dark"
						aria-label="Save"
						class="cursor-pointer text-blue-600"
						disabled={!partConfig.isDirty}
						onclick={() => {
							partConfig.save()
						}}
					>
						<div class="flex gap-2">
							Save
							<div class="font-roboto-mono text-disabled flex items-center">
								<Icon
									name={iconName}
									size="xs"
								/>
								<span class="sr-only">{iconLabel}</span>
								<span>S</span>
							</div>
						</div>
					</Button>
				</div>
			{/if}
		</div>
	</div>
{/if}
