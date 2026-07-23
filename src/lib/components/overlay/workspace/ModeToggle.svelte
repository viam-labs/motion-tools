<script lang="ts">
	import { Button as PrimeButton } from '@viamrobotics/prime-core'

	import Button from '$lib/components/overlay/dashboard/Button.svelte'
	import Dialog from '$lib/components/overlay/Dialog.svelte'
	import { useWorld } from '$lib/ecs'
	import { resetStagedEdits } from '$lib/editing/resetStagedEdits'
	import { useEnvironment } from '$lib/hooks/useEnvironment.svelte'
	import { usePartConfig } from '$lib/hooks/usePartConfig.svelte'

	const environment = useEnvironment()
	const partConfig = usePartConfig()
	const world = useWorld()

	let confirmOpen = $state(false)

	// Leaving build mode with staged edits would silently hide them, so confirm
	// first. Switching without unsaved edits (or into build) is unguarded.
	const requestMonitor = () => {
		if (environment.current.mode === 'build' && partConfig.isDirty) {
			confirmOpen = true
			return
		}

		environment.current.mode = 'monitor'
	}

	const discardAndMonitor = () => {
		partConfig.discardChanges()
		resetStagedEdits(world)
		environment.current.mode = 'monitor'
		confirmOpen = false
	}
</script>

<fieldset class="flex">
	<Button
		class="rounded-r-none"
		icon="eye-outline"
		active={environment.current.mode === 'monitor'}
		description="Monitor live machine data"
		onclick={requestMonitor}
	/>
	<Button
		class="-ml-px rounded-l-none"
		icon="hammer"
		active={environment.current.mode === 'build'}
		description="Build the scene"
		onclick={() => {
			environment.current.mode = 'build'
		}}
	/>
</fieldset>

<Dialog
	bind:open={confirmOpen}
	title="Discard unsaved changes?"
	description="Switching to monitor mode will discard your unsaved frame edits."
>
	{#snippet actions({ close })}
		<PrimeButton onclick={close}>Cancel</PrimeButton>
		<PrimeButton
			variant="dark"
			onclick={discardAndMonitor}
		>
			Discard
		</PrimeButton>
	{/snippet}
</Dialog>
