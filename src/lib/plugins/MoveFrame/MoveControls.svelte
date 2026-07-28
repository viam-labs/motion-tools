<script lang="ts">
	import type { Matrix4 } from 'three'

	import { Button, Select, ToastVariant, useToast } from '@viamrobotics/prime-core'
	import { MotionClient } from '@viamrobotics/sdk'
	import { createResourceClient, useResourceNames } from '@viamrobotics/svelte-sdk'
	import { MotionMoveWidget } from '@viamrobotics/test-widgets'
	import {
		Point,
		type PointChangeEvent,
		type PointValue3dObject,
		type PointValue4dObject,
		RotationEuler,
		type RotationEulerChangeEvent,
		type RotationEulerValueObject,
		TabGroup,
		TabPage,
	} from 'svelte-tweakpane-ui'

	import type { Pose } from '$lib/math'

	import DashboardButton from '$lib/components/overlay/dashboard/Button.svelte'
	import FloatingPanel from '$lib/components/overlay/FloatingPanel.svelte'
	import { traits, useQuery } from '$lib/ecs'
	import { useFrames } from '$lib/hooks/useFrames.svelte'
	import { usePartID } from '$lib/hooks/usePartID.svelte'
	import { useSettings } from '$lib/hooks/useSettings.svelte'
	import { setOrientationFromEuler } from '$lib/transform'

	import { defaultMotionService, frameParent, motionServiceNames } from './moveControls'
	import MoveGizmo from './MoveGizmo.svelte'
	import { moveGizmoOwner } from './moveGizmoOwner.svelte'
	import MoveTabs from './MoveTabs.svelte'
	import MoveTargetGhost from './MoveTargetGhost.svelte'
	import { fromDestinationPose, moveDelta, toDestinationPose } from './moveTargetPose'
	import { useMovedFrameMatrix } from './useMovedFrameMatrix.svelte'
	import { useMoveGhosts } from './useMoveGhosts.svelte'

	interface Props {
		frameName: string
		onClose: () => void
	}

	const { frameName, onClose }: Props = $props()

	const MOVE_TAB = 'Move'
	const CONTROL_TAB = 'Control'

	/** The gizmo is dragged in world space, so the goal is committed against it. */
	const WORLD_FRAME = 'world'

	const partID = usePartID()
	const frames = useFrames()
	const named = useQuery(traits.Name)
	const settings = useSettings()
	const toast = useToast()
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

	let activeTab = $state(MOVE_TAB)
	let mode = $state<'translate' | 'rotate'>('translate')
	let space = $state<'local' | 'world'>('world')
	let executing = $state(false)

	/**
	 * The staged goal in world space, or `undefined` while the gizmo still tracks
	 * the frame. Raw because it is a Three.js instance replaced wholesale on every
	 * drag frame.
	 */
	let targetWorldMatrix = $state.raw<Matrix4>()

	const movedEntity = $derived(
		named.current.find((entity) => entity.get(traits.Name) === frameName)
	)

	// The handle is live for as long as the Move tab is showing. Claim the single
	// gizmo slot so only one open panel drags at a time.
	const wantsGizmo = $derived(isOpen && activeTab === MOVE_TAB)

	/**
	 * The end effector, not the `<name>_origin` mount the scene draws the
	 * component at — that is the frame the motion service moves, so it is the
	 * frame the handle belongs on. Resolved in world space and only while the
	 * gizmo is live.
	 */
	const currentWorldMatrix = useMovedFrameMatrix(
		() => partID.current,
		() => frameName,
		() => wantsGizmo
	)
	$effect(() => {
		if (wantsGizmo) {
			moveGizmoOwner.arm(frameName)
			return () => moveGizmoOwner.disarm(frameName)
		}
	})

	// While this panel owns the gizmo, put the scene into `gizmo` mode so a drag
	// can't fall through to the scene and change the selection. Restore `navigate`
	// after.
	const armed = $derived(moveGizmoOwner.armedFrame === frameName)
	$effect(() => {
		if (wantsGizmo && armed) {
			settings.current.interactionMode = 'gizmo'
			return () => {
				// Only hand the scene back if the gizmo wasn't taken over by another
				// panel — otherwise this teardown would re-enable picking underneath a
				// gizmo that is still live.
				const owner = moveGizmoOwner.armedFrame
				const handedOff = owner !== undefined && owner !== frameName
				if (!handedOff && settings.current.interactionMode === 'gizmo') {
					settings.current.interactionMode = 'navigate'
				}
			}
		}
	})

	/** Another open panel took the gizmo out from under this one. */
	const preempted = $derived(wantsGizmo && !armed)

	const showGizmo = $derived(
		wantsGizmo && armed && !executing && currentWorldMatrix.current !== undefined
	)

	/** Whether the handle has been dragged off the frame's live pose. */
	const staged = $derived(targetWorldMatrix !== undefined)

	/**
	 * What the readout describes: the staged goal once dragged, otherwise where
	 * the frame is right now. The panel shows the same rows either way, so the
	 * numbers are readable before the first drag rather than appearing with it.
	 */
	const readoutMatrix = $derived(targetWorldMatrix ?? currentWorldMatrix.current)

	// The handle is placed and dragged in world space, so the goal is expressed in
	// world too — no `<name>_origin` round-trip between what is dragged and what
	// is committed.
	const targetPose = $derived(readoutMatrix ? toDestinationPose(readoutMatrix) : undefined)

	const delta = $derived(
		readoutMatrix && currentWorldMatrix.current
			? moveDelta(currentWorldMatrix.current, readoutMatrix)
			: undefined
	)

	/** The orientation as Euler angles (deg), for the alternate rotation tab. */
	const eulerValue = $derived.by<RotationEulerValueObject>(() => {
		if (!targetPose) return { x: 0, y: 0, z: 0 }
		const { roll, pitch, yaw } = targetPose.toEulerDegrees()
		return { x: roll, y: pitch, z: yaw }
	})

	/** Numbers render as an em dash until the frame's pose has resolved. */
	const num = (value: number | undefined, digits: number) => value?.toFixed(digits) ?? '—'

	// Ghosts are entities, drawn by the scene's own renderers — see `moveGhosts`.
	// The subtree rides the delta between these two matrices, which the hook
	// composes itself so a live gizmo isn't allocating one per frame.
	useMoveGhosts(
		() => (wantsGizmo && armed ? movedEntity : undefined),
		() => currentWorldMatrix.current,
		() => targetWorldMatrix
	)

	const onDrag = (matrix: Matrix4) => (targetWorldMatrix = matrix)

	/**
	 * Stage an edited pose as the goal. Typing into a field before the first drag
	 * stages the frame's current pose with that one value changed, so the inputs
	 * and the gizmo are two views of the same goal.
	 */
	const stagePose = (pose: Pose) => (targetWorldMatrix = fromDestinationPose(pose))

	const handlePositionChange = (event: PointChangeEvent) => {
		if (event.detail.origin !== 'internal' || !targetPose) return
		const next = event.detail.value as PointValue3dObject
		stagePose(targetPose.clone().merge({ x: next.x, y: next.y, z: next.z }))
	}

	const handleOrientationOVChange = (event: PointChangeEvent) => {
		if (event.detail.origin !== 'internal' || !targetPose) return
		const next = event.detail.value as PointValue4dObject
		stagePose(targetPose.clone().merge({ oX: next.x, oY: next.y, oZ: next.z, theta: next.w }))
	}

	const handleOrientationEulerChange = (event: RotationEulerChangeEvent) => {
		if (event.detail.origin !== 'internal' || !targetPose) return
		const next = event.detail.value as RotationEulerValueObject
		const pose = targetPose.clone()
		setOrientationFromEuler(targetPose, { roll: next.x, pitch: next.y, yaw: next.z }, pose)
		stagePose(pose)
	}

	/** Drop the staged goal so the gizmo snaps back to wherever the frame is now. */
	const resetTarget = () => (targetWorldMatrix = undefined)

	const executeMove = async () => {
		const client = motion.current
		if (!client || !targetPose || !service || !staged) return

		executing = true
		try {
			const success = await client.move(
				{ referenceFrame: WORLD_FRAME, pose: targetPose },
				frameName
			)
			toast({
				message: success
					? `Moved "${frameName}" to the target.`
					: `Move for "${frameName}" did not complete.`,
				variant: success ? ToastVariant.Success : ToastVariant.Warning,
			})
			if (success) resetTarget()
		} catch (error) {
			toast({
				message: error instanceof Error ? error.message : `Failed to move "${frameName}".`,
				variant: ToastVariant.Danger,
			})
		} finally {
			executing = false
		}
	}
</script>

{#snippet gizmoOptions()}
	<div class="flex flex-wrap items-center gap-2">
		<!-- transform — same controls as the build-mode dashboard -->
		<fieldset class="flex">
			<DashboardButton
				icon="cursor-move"
				class="rounded-r-none"
				active={mode === 'translate'}
				description="Translate"
				onclick={() => (mode = 'translate')}
			/>
			<DashboardButton
				icon="sync"
				class="-ml-px rounded-l-none"
				active={mode === 'rotate'}
				description="Rotate"
				onclick={() => (mode = 'rotate')}
			/>
		</fieldset>

		<!-- space -->
		<fieldset class="flex">
			<DashboardButton
				icon="axis-arrow"
				class="rounded-r-none"
				active={space === 'local'}
				description="Local space"
				onclick={() => (space = 'local')}
			/>
			<DashboardButton
				icon="earth"
				class="-ml-px rounded-l-none"
				active={space === 'world'}
				description="World space"
				onclick={() => (space = 'world')}
			/>
		</fieldset>
	</div>
{/snippet}

{#snippet moveTab()}
	<div class="flex flex-col gap-3 p-1">
		{#if preempted}
			<div class="border-light flex items-center justify-between gap-2 border px-2 py-1.5">
				<p class="text-subtle-1">Another move panel has the gizmo.</p>
				<Button
					variant="ghost"
					onclick={() => moveGizmoOwner.arm(frameName)}
				>
					Use it here
				</Button>
			</div>
		{/if}

		{@render gizmoOptions()}

		<div class="flex flex-col gap-2">
			<div class="text-subtle-2">
				{staged ? 'Target' : 'Current'} · relative to
				<span class="text-default">{WORLD_FRAME}</span>
			</div>

			{#if targetPose}
				<div>
					<strong class="font-semibold">position</strong>
					<span class="text-subtle-2">(mm)</span>

					<div aria-label="move target position">
						<Point
							value={{ x: targetPose.x, y: targetPose.y, z: targetPose.z }}
							disabled={executing}
							on:change={handlePositionChange}
						/>
					</div>
				</div>

				<div>
					<strong class="font-semibold">orientation</strong>

					<div aria-label="move target orientation">
						<TabGroup>
							<TabPage title="OV (deg)">
								<Point
									value={{
										x: targetPose.oX,
										y: targetPose.oY,
										z: targetPose.oZ,
										w: targetPose.theta,
									}}
									disabled={executing}
									on:change={handleOrientationOVChange}
								/>
							</TabPage>
							<TabPage title="Euler">
								<RotationEuler
									value={eulerValue}
									unit="deg"
									disabled={executing}
									on:change={handleOrientationEulerChange}
								/>
							</TabPage>
						</TabGroup>
					</div>
				</div>
			{:else}
				<p class="text-subtle-2">Resolving the frame's pose…</p>
			{/if}

			<div class="font-roboto-mono flex justify-between gap-2">
				<span class="text-subtle-2">travel</span>
				<span>{num(delta?.distance, 1)} mm · {num(delta?.angle, 1)}°</span>
			</div>
		</div>

		<div class="flex items-center gap-2">
			<Button
				variant="success"
				disabled={!staged || executing || !service}
				progress={executing ? 'indeterminate' : undefined}
				onclick={executeMove}
			>
				Execute move
			</Button>
			<Button
				variant="ghost"
				disabled={!staged || executing}
				onclick={resetTarget}
			>
				Reset
			</Button>
		</div>
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
				defaultTab={MOVE_TAB}
				onValueChange={(value) => (activeTab = value)}
				items={[
					{ label: MOVE_TAB, content: moveTab },
					{ label: CONTROL_TAB, content: controlTab },
				]}
			/>
		</div>
	</div>
</FloatingPanel>

{#if showGizmo && currentWorldMatrix.current}
	<MoveGizmo
		currentWorldMatrix={currentWorldMatrix.current}
		{targetWorldMatrix}
		{mode}
		{space}
		{onDrag}
	/>
{/if}

{#if wantsGizmo && armed && targetWorldMatrix && currentWorldMatrix.current}
	<MoveTargetGhost
		currentWorldMatrix={currentWorldMatrix.current}
		{targetWorldMatrix}
	/>
{/if}
