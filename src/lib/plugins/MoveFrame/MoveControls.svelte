<script lang="ts">
	import type { Pose } from '@viamrobotics/sdk'
	import type { Vector3 } from 'three'

	import {
		Button,
		Select,
		Switch,
		ToastVariant,
		useNotify,
		useToast,
	} from '@viamrobotics/prime-core'
	import { MotionClient } from '@viamrobotics/sdk'
	import { createResourceClient, useResourceNames } from '@viamrobotics/svelte-sdk'
	import { MotionMoveWidget } from '@viamrobotics/test-widgets'
	import { Slider, type SliderChangeEvent } from 'svelte-tweakpane-ui'

	import FloatingPanel from '$lib/components/overlay/FloatingPanel.svelte'
	import { traits, useQuery } from '$lib/ecs'
	import { useFrames } from '$lib/hooks/useFrames.svelte'
	import { usePartID } from '$lib/hooks/usePartID.svelte'
	import { useSettings } from '$lib/hooks/useSettings.svelte'

	import { buildTargetPose, type OrientationMode } from './buildTargetPose'
	import { defaultMotionService, frameParent, motionServiceNames } from './moveControls'
	import { movePicker } from './movePicker.svelte'
	import MoveTabs from './MoveTabs.svelte'
	import MoveTargetMarker from './MoveTargetMarker.svelte'
	import MoveTargetPicker from './MoveTargetPicker.svelte'

	interface Props {
		frameName: string
		onClose: () => void
	}

	const { frameName, onClose }: Props = $props()

	const CLICK_TAB = 'Click to move'
	const CONTROL_TAB = 'Control'

	const partID = usePartID()
	const frames = useFrames()
	const named = useQuery(traits.Name)
	const settings = useSettings()
	const toast = useToast()
	const notify = useNotify()
	const motionResources = useResourceNames(() => partID.current, 'motion')

	const motionServices = $derived(motionServiceNames(motionResources.current))
	const defaultService = $derived(defaultMotionService(motionServices))

	let selectedService = $state<string>()
	const service = $derived(selectedService ?? defaultService)
	const destination = $derived(frameParent(frames.current, frameName))

	const motion = createResourceClient(
		MotionClient,
		() => partID.current,
		() => service
	)

	let isOpen = $state(true)
	const isFrame = $derived(named.current.some((entity) => entity.get(traits.Name) === frameName))
	$effect(() => {
		if (!isFrame) isOpen = false
	})
	$effect(() => {
		if (!isOpen) onClose()
	})

	let activeTab = $state(CLICK_TAB)
	let orientationMode = $state<OrientationMode>('keep')
	let standoff = $state(50)
	let executing = $state(false)
	let lastHit = $state.raw<{ worldPoint: Vector3; worldNormal?: Vector3 }>()

	const movedEntity = $derived(
		named.current.find((entity) => entity.get(traits.Name) === frameName)
	)

	const destinationEntity = $derived(
		named.current.find((entity) => entity.get(traits.Name) === destination)
	)

	const hasNormal = $derived(lastHit?.worldNormal !== undefined)

	const pickedPose = $derived.by<Pose | undefined>(() => {
		if (!lastHit) return undefined
		return buildTargetPose({
			worldPoint: lastHit.worldPoint,
			worldNormal: lastHit.worldNormal,
			destinationWorldMatrix: destinationEntity?.get(traits.WorldMatrix),
			currentWorldMatrix: movedEntity?.get(traits.WorldMatrix),
			orientation: orientationMode,
			standoff,
		})
	})

	// Picking is live while the click-to-move tab is open and nothing is picked yet.
	// Claim the single picking slot so only one open panel picks at a time.
	const picking = $derived(isOpen && activeTab === CLICK_TAB && lastHit === undefined)
	$effect(() => {
		if (picking) {
			movePicker.arm(frameName)
			return () => movePicker.disarm(frameName)
		}
	})

	// While this panel owns picking, put the scene into `move` mode (disables
	// entity selection, enables accelerated picking) and restore `navigate` after.
	const armed = $derived(movePicker.armedFrame === frameName)
	$effect(() => {
		if (picking && armed) {
			settings.current.interactionMode = 'move'
			return () => {
				if (settings.current.interactionMode === 'move') {
					settings.current.interactionMode = 'navigate'
				}
			}
		}
	})

	const pickerEnabled = $derived(picking && armed && settings.current.interactionMode === 'move')

	const onPick = (hit: { worldPoint: Vector3; worldNormal?: Vector3 }) => (lastHit = hit)
	const resetToPick = () => (lastHit = undefined)

	const handleStandoffChange = (event: SliderChangeEvent) => {
		if (event.detail.origin !== 'internal') return
		standoff = event.detail.value
	}

	const executeMove = async () => {
		const client = motion.current
		if (!client || !pickedPose || !service) return

		executing = true
		try {
			const success = await client.move(
				{ referenceFrame: destination, pose: pickedPose },
				frameName
			)
			if (success) {
				toast({
					message: `Moved "${frameName}" to the destination.`,
					variant: ToastVariant.Success,
				})
				resetToPick()
			} else {
				notify.warn(`Move for "${frameName}" did not complete.`)
			}
		} catch (error) {
			notify.danger(
				`Failed to move "${frameName}".`,
				error instanceof Error ? error.message : undefined,
				{ persist: true }
			)
		} finally {
			executing = false
		}
	}
</script>

{#snippet options()}
	<div class="flex flex-col gap-2">
		<label class="flex items-center justify-between gap-2">
			<span class="text-subtle-1">Align to surface</span>
			<Switch
				on={orientationMode === 'align'}
				on:change={(event) => (orientationMode = event.detail ? 'align' : 'keep')}
			/>
		</label>

		{#if orientationMode === 'align'}
			<p class="text-subtle-2">
				Falls back to keeping the current orientation on surfaces without a normal (e.g. point
				clouds).
			</p>
		{/if}

		<div aria-label="mutable approach offset">
			<Slider
				value={standoff}
				min={0}
				max={500}
				step={5}
				label="Approach offset (mm)"
				format={(value) => value.toFixed(0)}
				on:change={handleStandoffChange}
			/>
		</div>
	</div>
{/snippet}

{#snippet clickTab()}
	<div class="flex flex-col gap-3 p-1">
		{#if pickedPose}
			<div class="flex flex-col gap-2">
				<div class="text-subtle-2">
					Destination · relative to <span class="text-default">{destination}</span>
				</div>
				<div class="font-roboto-mono flex flex-col gap-1">
					<div class="flex justify-between gap-2">
						<span class="text-subtle-2">pos (mm)</span>
						<span
							>{pickedPose.x.toFixed(1)}, {pickedPose.y.toFixed(1)}, {pickedPose.z.toFixed(1)}</span
						>
					</div>
					<div class="flex justify-between gap-2">
						<span class="text-subtle-2">ov</span>
						<span
							>{pickedPose.oX.toFixed(2)}, {pickedPose.oY.toFixed(2)}, {pickedPose.oZ.toFixed(
								2
							)}</span
						>
					</div>
					<div class="flex justify-between gap-2">
						<span class="text-subtle-2">θ (deg)</span>
						<span>{pickedPose.theta.toFixed(1)}</span>
					</div>
				</div>
			</div>

			{@render options()}

			{#if orientationMode === 'align' && !hasNormal}
				<p class="text-warning-dark">No surface normal here — keeping the current orientation.</p>
			{/if}

			<div class="flex items-center gap-2">
				<Button
					variant="success"
					disabled={executing || !service}
					progress={executing ? 'indeterminate' : undefined}
					onclick={executeMove}
				>
					Execute move
				</Button>
				<Button
					variant="ghost"
					disabled={executing}
					onclick={resetToPick}
				>
					Pick again
				</Button>
			</div>
		{:else}
			<p class="text-subtle-1">
				Click a surface in the scene to set where <span class="text-default">{frameName}</span> should
				move.
			</p>

			{@render options()}
		{/if}
	</div>
{/snippet}

{#snippet controlTab()}
	<div class="p-1">
		{#if service}
			<MotionMoveWidget
				partID={partID.current}
				resourceName={service}
				{frameName}
				{destination}
			/>
		{/if}
	</div>
{/snippet}

<FloatingPanel
	title={`Move: ${frameName}`}
	bind:isOpen
	resizable
	defaultSize={{ width: 360, height: 480 }}
>
	<div class="flex h-full flex-col gap-3 overflow-hidden p-2 text-xs">
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

		<div class="min-h-0 flex-1">
			<MoveTabs
				defaultTab={CLICK_TAB}
				onValueChange={(value) => (activeTab = value)}
				items={[
					{ label: CLICK_TAB, content: clickTab },
					{ label: CONTROL_TAB, content: controlTab },
				]}
			/>
		</div>
	</div>
</FloatingPanel>

<MoveTargetPicker
	enabled={pickerEnabled}
	{standoff}
	{onPick}
/>

{#if isOpen && activeTab === CLICK_TAB && lastHit}
	<MoveTargetMarker
		point={lastHit.worldPoint}
		worldNormal={lastHit.worldNormal}
		{standoff}
	/>
{/if}
