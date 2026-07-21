<script lang="ts">
	import { Select } from '@viamrobotics/prime-core'
	import { useResourceNames } from '@viamrobotics/svelte-sdk'
	import { MotionMoveWidget } from '@viamrobotics/test-widgets'

	import FloatingPanel from '$lib/components/overlay/FloatingPanel.svelte'
	import { traits, useQuery } from '$lib/ecs'
	import { useFrames } from '$lib/hooks/useFrames.svelte'
	import { usePartID } from '$lib/hooks/usePartID.svelte'

	import {
		defaultMotionService,
		frameParent,
		motionServiceNames,
		referenceFrameOptions,
	} from './moveControls'

	interface Props {
		/** The frame system frame to move. */
		frameName: string
		/** Called when the panel closes — a user action or the frame leaving the scene. */
		onClose: () => void
	}

	const { frameName, onClose }: Props = $props()

	const partID = usePartID()
	const frames = useFrames()
	const named = useQuery(traits.Name)
	const motionResources = useResourceNames(() => partID.current, 'motion')

	const motionServices = $derived(motionServiceNames(motionResources.current))
	const defaultService = $derived(defaultMotionService(motionServices))

	let selectedService = $state<string>()
	const service = $derived(selectedService ?? defaultService)

	const destinations = $derived(referenceFrameOptions(frames.current))
	const parent = $derived(frameParent(frames.current, frameName))

	let selectedDestination = $state<string>()
	const destination = $derived(selectedDestination ?? parent)

	let isOpen = $state(true)
	const isFrame = $derived(named.current.some((entity) => entity.get(traits.Name) === frameName))
	$effect(() => {
		if (!isFrame) isOpen = false
	})

	$effect(() => {
		if (!isOpen) onClose()
	})
</script>

<FloatingPanel
	title={`Move: ${frameName}`}
	bind:isOpen
	resizable
	defaultSize={{ width: 360, height: 480 }}
>
	<div class="flex h-full flex-col gap-4 overflow-y-auto p-2 text-xs">
		<label class="flex flex-col gap-1">
			<span class="text-subtle-2">Motion service</span>
			<Select
				value={service}
				onchange={(event: Event) => {
					if (event.target instanceof HTMLSelectElement) {
						selectedService = event.target.value
					}
				}}
			>
				{#each motionServices as name (name)}
					<option value={name}>{name}</option>
				{/each}
			</Select>
		</label>

		<label class="flex flex-col gap-1">
			<span class="text-subtle-2">Destination frame</span>
			<Select
				value={destination}
				onchange={(event: Event) => {
					if (event.target instanceof HTMLSelectElement) {
						selectedDestination = event.target.value
					}
				}}
			>
				{#each destinations as name (name)}
					<option value={name}>{name}</option>
				{/each}
			</Select>
		</label>

		{#if service}
			<MotionMoveWidget
				partID={partID.current}
				resourceName={service}
				{frameName}
				{destination}
			/>
		{/if}
	</div>
</FloatingPanel>
