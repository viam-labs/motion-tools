<script lang="ts">
	import type { ComponentProps } from 'svelte'
	import type { ClassValue } from 'svelte/elements'

	import { Button as PrimeButton } from '@viamrobotics/prime-core'

	import Button from '$lib/components/overlay/dashboard/Button.svelte'
	import Dialog from '$lib/components/overlay/Dialog.svelte'
	import { useWorld } from '$lib/ecs'
	import { resetStagedEdits } from '$lib/editing/resetStagedEdits'
	import { type EnvironmentMode, useEnvironment } from '$lib/hooks/useEnvironment.svelte'
	import { usePartConfig } from '$lib/hooks/usePartConfig.svelte'

	interface Props {
		/** The mode this button switches the app into. */
		mode: EnvironmentMode
		icon: ComponentProps<typeof Button>['icon']
		description: string
		class?: ClassValue
	}

	const { mode, icon, description, class: className }: Props = $props()

	const environment = useEnvironment()
	const partConfig = usePartConfig()
	const world = useWorld()

	let confirmOpen = $state(false)

	// Leaving build mode with staged edits would silently hide them, so confirm
	// first. Switching without unsaved edits (or into build) is unguarded.
	const request = () => {
		if (mode !== 'build' && environment.current.mode === 'build' && partConfig.isDirty) {
			confirmOpen = true
			return
		}

		environment.current.mode = mode
	}

	const discardAndSwitch = () => {
		partConfig.discardChanges()
		resetStagedEdits(world)
		environment.current.mode = mode
		confirmOpen = false
	}
</script>

<Button
	class={className}
	{icon}
	{description}
	active={environment.current.mode === mode}
	onclick={request}
/>

<Dialog
	bind:open={confirmOpen}
	title="Discard unsaved changes?"
	description={`Switching to ${mode} mode will discard your unsaved frame edits.`}
>
	{#snippet actions({ close })}
		<PrimeButton onclick={close}>Cancel</PrimeButton>
		<PrimeButton
			variant="dark"
			onclick={discardAndSwitch}
		>
			Discard
		</PrimeButton>
	{/snippet}
</Dialog>
