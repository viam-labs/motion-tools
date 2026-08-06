<script lang="ts">
	import type { Entity } from 'koota'
	import type { HTMLAttributes } from 'svelte/elements'
	import type { Matrix4 } from 'three'

	import { Button, ToastVariant, useToast } from '@viamrobotics/prime-core'
	import { MotionClient } from '@viamrobotics/sdk'
	import { createResourceClient, useResourceNames } from '@viamrobotics/svelte-sdk'
	import { PersistedState } from 'runed'
	import {
		List,
		type ListChangeEvent,
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

	import DetailsPanel from '$lib/components/overlay/details/DetailsPanel.svelte'
	import { useWorld } from '$lib/ecs'
	import { useFrames } from '$lib/hooks/useFrames.svelte'
	import { usePartID } from '$lib/hooks/usePartID.svelte'
	import { setOrientationFromEuler } from '$lib/math/transform'

	import Collisions from './collisions/Collisions.svelte'
	import { defaultMotionService, motionServiceNames } from './moveControls'
	import { moveExecutionOwner } from './moveExecutionOwner.svelte'
	import MoveGizmo from './MoveGizmo.svelte'
	import { moveGizmoOptions } from './moveGizmoOptions.svelte'
	import { moveGizmoOwner } from './moveGizmoOwner.svelte'
	import MoveJsonField from './MoveJsonField.svelte'
	import MovePreview from './MovePreview.svelte'
	import MoveTargetGhost from './MoveTargetGhost.svelte'
	import { fromDestinationPose, moveDelta, toDestinationPose } from './moveTargetPose'
	import { parseMoveOptions } from './parseMoveOptions'
	import { executeCommand } from './planDoCommand'
	import { useMovedFrameMatrix } from './useMovedFrameMatrix.svelte'
	import { useMoveGhosts } from './useMoveGhosts.svelte'
	import { usePreviewMove } from './usePreviewMove.svelte'

	interface Props extends HTMLAttributes<HTMLDivElement> {
		/** The selected frame this panel is the details for. */
		entity: Entity
		frameName: string
	}

	const { entity, frameName, ...rest }: Props = $props()

	/** The gizmo is dragged in world space, so the goal is committed against it. */
	const WORLD_FRAME = 'world'

	const world = useWorld()
	const frames = useFrames()
	const partID = usePartID()
	const toast = useToast()
	const motionResources = useResourceNames(() => partID.current, 'motion')

	const motionServices = $derived(motionServiceNames(motionResources.current))
	const defaultService = $derived(defaultMotionService(motionServices))

	let selectedService = $state<string>()
	const service = $derived(selectedService ?? defaultService)

	const motion = createResourceClient(
		MotionClient,
		() => partID.current,
		() => service
	)

	// Hand-written JSON is expensive to retype, and the panel unmounts with the
	// selection, so keep each frame's fields across mounts and reloads.
	const worldStateJson = $derived(
		new PersistedState(`motion-tools:move-world-state:${partID.current}:${frameName}`, '')
	)
	const constraintsJson = $derived(
		new PersistedState(`motion-tools:move-constraints:${partID.current}:${frameName}`, '')
	)

	/** This panel's own move is running, so it shows progress rather than disabling outright. */
	const executing = $derived(moveExecutionOwner.movingFrame === frameName)

	/** Another panel is already driving the machine; see `moveExecutionOwner` for why that matters. */
	const otherPanelMoving = $derived(
		moveExecutionOwner.movingFrame !== undefined && moveExecutionOwner.movingFrame !== frameName
	)

	/**
	 * A resource *name* is not a client. `useResourceNames` serves names from cache with
	 * `staleTime: Infinity`, while `createResourceClient` yields `undefined` for as long as the
	 * connection is not `CONNECTED` — so on a dropped socket, or in the gap after selecting a part,
	 * `service` is set and `motion.current` is not. Gating the buttons on `!service` alone left them
	 * lit and inert, which is the thing the comment on `Execute preview` argues against.
	 */
	const canCommand = $derived(motion.current !== undefined && service !== undefined)

	/**
	 * The staged goal in world space, or `undefined` while the gizmo still tracks
	 * the frame. Raw because it is a Three.js instance replaced wholesale on every
	 * drag frame.
	 */
	let targetWorldMatrix = $state.raw<Matrix4>()

	/**
	 * The end effector, not the `<name>_origin` mount the scene draws the
	 * component at — that is the frame the motion service moves, so it is the
	 * frame the handle belongs on. Resolved in world space.
	 */
	const currentWorldMatrix = useMovedFrameMatrix(
		() => partID.current,
		() => frameName,
		() => true
	)

	// The handle is live for as long as the panel is. Claim the single gizmo slot
	// so only one open panel drags at a time.
	$effect(() => {
		moveGizmoOwner.arm(frameName)
		return () => moveGizmoOwner.disarm(frameName)
	})

	const armed = $derived(moveGizmoOwner.armedFrame === frameName)

	/** Another open panel took the gizmo out from under this one. */
	const preempted = $derived(!armed)

	const showGizmo = $derived(armed && !executing && currentWorldMatrix.current !== undefined)

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
		() => (armed ? entity : undefined),
		() => currentWorldMatrix.current,
		() => targetWorldMatrix
	)

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

	/**
	 * Ask the motion service to plan this move without running it, and draw the answer as a ghost
	 * twin of the machine.
	 *
	 * `invalidateOn` names every input the plan was computed from, not just the goal. Editing the
	 * world state to describe an obstacle the preview just revealed is the whole reason that field
	 * exists — and with only the goal in the key, the ghosts, the scrubber and `Execute preview` all
	 * survived the edit, still describing a path planned as though the obstacle were not there.
	 */
	const preview = usePreviewMove({
		world,
		frames,
		client: () => motion.current,
		service: () => service,
		frameName: () => frameName,
		destination: () => (targetPose ? { referenceFrame: WORLD_FRAME, pose: targetPose } : undefined),
		moveOptions: () => parseMoveOptions(worldStateJson.current, constraintsJson.current),
		invalidateOn: () => [
			targetWorldMatrix,
			worldStateJson.current,
			constraintsJson.current,
			service,
			// The kinematics the ghosts are drawn through, not just the problem that was posed.
			// `useFrames` refetches on every config revision, and a frame system that has changed
			// underneath a drawn plan puts the ghosts somewhere the machine never was.
			frames.parts,
		],
	})

	/** Drop the staged goal so the gizmo snaps back to wherever the frame is now. */
	const resetTarget = () => {
		targetWorldMatrix = undefined
		preview.clear()
	}

	const handleServiceChange = (event: ListChangeEvent) => {
		if (event.detail.origin !== 'internal') return
		selectedService = event.detail.value as string
	}

	/**
	 * Run the trajectory the preview drew, exactly as drawn — `execute` does not replan.
	 *
	 * That is the point: the preview is what is being approved. Two things can have gone stale since
	 * it was drawn, and only one of them is checked. `executeCommand` arms RDK's own start-state
	 * guard, so a component that has drifted away from the configuration the plan begins at refuses
	 * rather than flying a path nothing validated. The world it was planned against is still a
	 * snapshot — a dynamic obstacle that has moved since is invisible to both sides, which is why
	 * `executeMove`, which replans, stays available alongside this.
	 */
	const executePreviewedMove = async () => {
		const client = motion.current
		if (!client || preview.status !== 'ready') return
		// RDK cannot arbitrate this one for us: `execute` goes through `DoCommand`, which carries no
		// operation label, so nothing on the server cancels a move another panel started.
		if (!moveExecutionOwner.claim(frameName)) return

		try {
			// `execute` answers `{execute: true}` or errors; there is no partial-success reply to read.
			await client.doCommand(executeCommand(preview.trajectory))
			toast({
				message: `Moved "${frameName}" along the previewed plan.`,
				variant: ToastVariant.Success,
			})
			resetTarget()
		} catch (error) {
			toast({
				message:
					error instanceof Error ? error.message : `Failed to execute the plan for "${frameName}".`,
				variant: ToastVariant.Danger,
			})
			// A failed `execute` is not a move that never happened: RDK batches the waypoints to the
			// component and can stop anywhere along them. Whatever configuration the machine is in now,
			// it is not the one this plan starts from, so the drawing on screen is no longer about it.
			preview.clear()
		} finally {
			moveExecutionOwner.release(frameName)
		}
	}

	const executeMove = async () => {
		const client = motion.current
		if (!client || !targetPose || !service || !staged) return
		if (!moveExecutionOwner.claim(frameName)) return

		// This replans from wherever the machine is when RDK gets to it, so any drawn plan is
		// superseded the moment we commit. Clearing here rather than after also cancels a plan still
		// in flight, which would otherwise land and draw ghosts for a configuration already left.
		preview.clear()

		try {
			const { worldState, constraints } = parseMoveOptions(
				worldStateJson.current,
				constraintsJson.current
			)
			const success = await client.move(
				{ referenceFrame: WORLD_FRAME, pose: targetPose },
				frameName,
				worldState,
				constraints
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
			moveExecutionOwner.release(frameName)
		}
	}
</script>

{#snippet moveControls()}
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

	<div class="flex flex-col gap-2">
		{#if targetPose}
			<div>
				<strong class="font-semibold">world position</strong>
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
				<strong class="font-semibold">world orientation</strong>

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

		<div>
			<strong class="font-semibold">travel</strong>
			<div class="mt-0.5">
				{num(delta?.distance, 1)} mm · {num(delta?.angle, 1)}°
			</div>
		</div>
	</div>

	<div class="flex flex-col gap-1">
		<MoveJsonField
			label="World state"
			value={worldStateJson.current}
			onChange={(next) => (worldStateJson.current = next)}
		/>
		<MoveJsonField
			label="Constraints"
			value={constraintsJson.current}
			onChange={(next) => (constraintsJson.current = next)}
		/>
	</div>

	<Collisions />

	<MovePreview
		{preview}
		{frameName}
		disabled={!staged || executing || otherPanelMoving || !canCommand}
	/>

	<div class="flex flex-wrap items-center gap-2">
		{#if preview.status === 'ready'}
			<!--
				Not `!staged` as well, the way its siblings read: this button only exists while the
				preview is `ready`, which is a stronger claim — a plan was drawn for a staged goal, and
				dropping the goal clears the preview with it. Repeating the weaker condition would only
				add a way for the button to be on screen and inert. `canCommand` is not redundant: it
				covers the client as well as the service name, which is the half that actually goes
				undefined on a dropped connection, and an armed-looking button that silently does nothing
				is worse than a disabled one.
			-->
			<Button
				variant="success"
				disabled={executing || otherPanelMoving || !canCommand}
				progress={executing ? 'indeterminate' : undefined}
				title="Run the trajectory shown above, without planning again"
				onclick={executePreviewedMove}
			>
				Execute preview
			</Button>
		{/if}

		<Button
			variant={preview.status === 'ready' ? 'outline-success' : 'success'}
			disabled={!staged || executing || otherPanelMoving || !canCommand}
			progress={executing ? 'indeterminate' : undefined}
			title={preview.status === 'ready'
				? 'Plan again against the current world state, then execute'
				: undefined}
			onclick={executeMove}
		>
			{preview.status === 'ready' ? 'Re-plan & execute' : 'Execute move'}
		</Button>

		<Button
			variant="ghost"
			disabled={!staged || executing}
			onclick={resetTarget}
		>
			Reset
		</Button>
	</div>
{/snippet}

<DetailsPanel
	{entity}
	{...rest}
>
	<h3 class="text-subtle-2 pt-3 pb-2">Move</h3>

	<div class="flex flex-col gap-3">
		{#if service}
			<div>
				<strong class="font-semibold">motion service</strong>
				<List
					options={motionServices}
					value={service}
					on:change={handleServiceChange}
				/>
			</div>
		{:else}
			<p class="text-subtle-2">No motion service available.</p>
		{/if}

		{@render moveControls()}
	</div>
</DetailsPanel>

{#if showGizmo && currentWorldMatrix.current}
	<MoveGizmo
		currentWorldMatrix={currentWorldMatrix.current}
		{targetWorldMatrix}
		mode={moveGizmoOptions.mode}
		space={moveGizmoOptions.space}
		onDrag={(matrix: Matrix4) => (targetWorldMatrix = matrix)}
	/>
{/if}

{#if armed && targetWorldMatrix && currentWorldMatrix.current}
	<MoveTargetGhost
		currentWorldMatrix={currentWorldMatrix.current}
		{targetWorldMatrix}
	/>
{/if}
