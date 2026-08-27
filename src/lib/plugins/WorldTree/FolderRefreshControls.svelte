<script lang="ts">
	import { Check, MoreHorizontal, Pause, Play } from 'lucide-svelte'

	import type { RefreshRateId } from '$lib/hooks/useSettings.svelte'

	import Popover from '$lib/components/overlay/Popover.svelte'
	import {
		isPollingRate,
		RefetchRates,
		refetchRateOptionsFor,
	} from '$lib/components/overlay/refetchRates'
	import { DEFAULT_REFRESH_RATES, useSettings } from '$lib/hooks/useSettings.svelte'

	interface Props {
		id: RefreshRateId
		/** Folder name, so each control names the group it acts on. */
		label: string
	}

	const { id, label }: Props = $props()

	const settings = useSettings()
	const { refreshRates } = $derived(settings.current)
	const rate = $derived(refreshRates[id] ?? RefetchRates.MANUAL)
	const isPolling = $derived(isPollingRate(rate))
	const options = $derived(refetchRateOptionsFor(id))

	// Where resuming lands. Only a polling rate seeds it, so a group paused before it
	// ever polled falls back to the rate it ships with.
	let resumeRate = $state(
		isPollingRate(settings.current.refreshRates[id])
			? settings.current.refreshRates[id]
			: DEFAULT_REFRESH_RATES[id]
	)

	const setRate = (value: number) => {
		if (isPollingRate(value)) resumeRate = value
		refreshRates[id] = value
	}
</script>

<button
	type="button"
	class="text-gray-6 hover:text-default"
	aria-label="{isPolling ? 'Pause' : 'Resume'} {label}"
	onclick={(event) => {
		event.stopPropagation()
		setRate(isPolling ? RefetchRates.MANUAL : resumeRate)
	}}
>
	{#if isPolling}
		<Pause size={14} />
	{:else}
		<Play size={14} />
	{/if}
</button>

<Popover placement="bottom-end">
	{#snippet trigger(triggerProps)}
		{@const { onclick, ...triggerRest } = triggerProps}
		<button
			{...triggerRest}
			class="text-gray-6 hover:text-default"
			aria-label="{label} refresh rate"
			onclick={(event) => {
				// The folder row expands on click, and the trigger sits inside it.
				event.stopPropagation()
				onclick?.(event)
			}}
		>
			<MoreHorizontal size={14} />
		</button>
	{/snippet}

	{#snippet children({ close })}
		<ul class="font-public-sans flex min-w-52 flex-col py-1 text-xs">
			{#each options as option (option.value)}
				{@const isCurrent = rate === option.value}
				<li>
					<button
						type="button"
						aria-current={isCurrent || undefined}
						class={[
							'hover:bg-light flex w-full items-center gap-2 px-2 py-1.5 text-left',
							isCurrent ? 'text-default' : 'text-subtle-1',
						]}
						onclick={() => {
							setRate(option.value)
							close()
						}}
					>
						<span class={['flex size-3 shrink-0', !isCurrent && 'invisible']}>
							<Check size={12} />
						</span>
						{option.label}
					</button>
				</li>
			{/each}
		</ul>
	{/snippet}
</Popover>
