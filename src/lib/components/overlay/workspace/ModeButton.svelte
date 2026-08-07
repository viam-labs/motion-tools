<script
	module
	lang="ts"
>
	import type { EnvironmentMode } from '$lib/hooks/useEnvironment.svelte'

	/**
	 * Each mode owns a hue. Idle buttons wear it as their icon colour so the
	 * coding is learnable without clicking through every mode; the selected one
	 * takes the tinted-pill treatment of the machine-connection button it sits
	 * beside, and reveals its label.
	 *
	 * The hues avoid meanings already spoken for in this corner of the toolbar:
	 * green belongs to that connection pill, and `danger` red is used elsewhere
	 * for genuine faults.
	 *
	 * `border` and `fill` are separate because the brand `-light` extensions are
	 * alpha values (`cyberpunk-light` is `#a51aff0f`, 6% purple) rather than the
	 * opaque tints the semantic ones use. The fill therefore goes on the button,
	 * which composites over the label's white backing instead of over the 3D
	 * scene behind the toolbar.
	 *
	 * The label inherits its hue from `fill` so the word always matches the glyph
	 * beside it. Note that puts Build's word at 2.9:1 against its own tint, below
	 * the 4.5:1 needed at 12px — a deliberate trade for keeping the mode's colour
	 * coding intact. The tooltip and `aria-label` carry the same meaning for
	 * anyone the amber fails.
	 */
	const appearance = {
		monitor: {
			label: 'Monitor',
			idle: 'text-info-dark',
			border: 'border-info-medium',
			fill: 'bg-info-light text-info-dark',
		},
		build: {
			label: 'Build',
			idle: 'text-warning-dark',
			border: 'border-warning-medium',
			fill: 'bg-warning-light text-warning-dark',
		},
		move: {
			label: 'Move',
			idle: 'text-cyberpunk-dark',
			border: 'border-cyberpunk-medium',
			fill: 'bg-cyberpunk-light text-cyberpunk-dark',
		},
	} as const satisfies Record<
		EnvironmentMode,
		{ label: string; idle: string; border: string; fill: string }
	>
</script>

<script lang="ts">
	import type { ClassValue } from 'svelte/elements'

	import { Icon, Button as PrimeButton, Tooltip } from '@viamrobotics/prime-core'
	import { Hammer, Move3d } from 'lucide-svelte'

	import Dialog from '$lib/components/overlay/Dialog.svelte'
	import { useWorld } from '$lib/ecs'
	import { resetStagedEdits } from '$lib/editing/resetStagedEdits'
	import { useEnvironment } from '$lib/hooks/useEnvironment.svelte'
	import { usePartConfig } from '$lib/hooks/usePartConfig.svelte'

	interface Props {
		/** The mode this button switches the app into. */
		mode: EnvironmentMode
		description: string
		class?: ClassValue
	}

	const { mode, description, class: className }: Props = $props()

	const environment = useEnvironment()
	const partConfig = usePartConfig()
	const world = useWorld()

	let confirmOpen = $state(false)

	const style = $derived(appearance[mode])
	const isSelected = $derived(environment.current.mode === mode)

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

<Tooltip
	let:tooltipID
	location="bottom"
>
	<label
		class={[
			className,
			'relative block rounded-md border bg-white',
			isSelected
				? ['z-4', style.border]
				: // Opaque surfaces, not `ghost-*` — those are translucent black and would
					// replace the white backing, letting the 3D scene show through on hover.
					'border-gray-5 hover:bg-light active:bg-medium',
		]}
		aria-describedby={tooltipID}
	>
		<!--
			`rounded-[inherit]` keeps the fill inside the label's corners without
			`overflow-hidden`, which would clip the browser's focus outline.
		-->
		<button
			class={['flex items-center rounded-[inherit] p-1.5', isSelected ? style.fill : style.idle]}
			role="radio"
			aria-label={description}
			aria-checked={isSelected}
			onclick={request}
		>
			{#if mode === 'monitor'}
				<Icon name="eye-outline" />
			{:else if mode === 'build'}
				<Hammer size="16" />
			{:else}
				<Move3d size="16" />
			{/if}

			<!--
				0fr → 1fr collapses the label to nothing without hardcoding its width,
				so the chip widens to whatever the word needs. The accessible name comes
				from the button's aria-label, so the clipped text is decorative.
			-->
			<span
				class="font-public-sans grid text-xs font-medium transition-[grid-template-columns] duration-150 ease-out motion-reduce:transition-none"
				style:grid-template-columns={isSelected ? '1fr' : '0fr'}
				aria-hidden="true"
			>
				<span class="overflow-hidden">
					<span class="block pl-1.5 whitespace-nowrap">{style.label}</span>
				</span>
			</span>
		</button>
	</label>
	<p slot="description">{description}</p>
</Tooltip>

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
