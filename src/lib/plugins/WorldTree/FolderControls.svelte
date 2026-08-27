<script lang="ts">
	import type { Component } from 'svelte'

	import { MoreHorizontal, Pause, Play } from 'lucide-svelte'

	import type { RefreshRateId } from '$lib/hooks/useSettings.svelte'

	import Popover from '$lib/components/overlay/Popover.svelte'
	import { isPollingRate, RefetchRates } from '$lib/components/overlay/refetchRates'
	import { DEFAULT_REFRESH_RATES, useSettings } from '$lib/hooks/useSettings.svelte'
	import FramesSettings from '$lib/plugins/Settings/FramesSettings.svelte'
	import PointcloudSettings from '$lib/plugins/Settings/PointcloudSettings.svelte'
	import VisionSettings from '$lib/plugins/Settings/VisionSettings.svelte'

	/** The settings tab that owns each polling group, so the folder opens its own. */
	const SETTINGS_PANELS: Record<RefreshRateId, Component> = {
		poses: FramesSettings,
		pointclouds: PointcloudSettings,
		vision: VisionSettings,
	}

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
	const SettingsPanel = $derived(SETTINGS_PANELS[id])

	// Latches the rate the group last polled at, wherever the change came from, so
	// resuming returns to it. A group that has never polled falls back to the rate
	// it ships with.
	let lastPollingRate = $state<number>()
	const resumeRate = $derived(lastPollingRate ?? DEFAULT_REFRESH_RATES[id])

	$effect(() => {
		if (isPolling) lastPollingRate = rate
	})
</script>

<button
	type="button"
	class="text-gray-6 hover:text-default"
	aria-label="{isPolling ? 'Pause' : 'Resume'} {label}"
	onclick={(event) => {
		event.stopPropagation()
		refreshRates[id] = isPolling ? RefetchRates.MANUAL : resumeRate
	}}
>
	{#if isPolling}
		<Pause size={14} />
	{:else}
		<Play size={14} />
	{/if}
</button>

<Popover placement="right-start">
	{#snippet trigger(triggerProps)}
		{@const { onclick, ...triggerRest } = triggerProps}
		<button
			{...triggerRest}
			class="text-gray-6 hover:text-default"
			aria-label="{label} settings"
			onclick={(event) => {
				// The folder row expands on click, and the trigger sits inside it.
				event.stopPropagation()
				onclick?.(event)
			}}
		>
			<MoreHorizontal size={14} />
		</button>
	{/snippet}

	<div class="font-public-sans text-default w-80 p-3">
		<SettingsPanel />
	</div>
</Popover>
