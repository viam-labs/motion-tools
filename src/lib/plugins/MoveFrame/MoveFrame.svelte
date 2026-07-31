<script lang="ts">
	import { World } from '@threlte/rapier'
	import { useResourceNames } from '@viamrobotics/svelte-sdk'

	import ModeTogglePortal from '$lib/components/overlay/Portals/ModeTogglePortal.svelte'
	import ModeButton from '$lib/components/overlay/workspace/ModeButton.svelte'
	import { traits, useQuery } from '$lib/ecs'
	import { useEnvironment } from '$lib/hooks/useEnvironment.svelte'
	import { usePartID } from '$lib/hooks/usePartID.svelte'

	import CollisionDetector from './collisions/CollisionDetector.svelte'
	import MoveControls from './MoveControls.svelte'

	const environment = useEnvironment()
	const partID = usePartID()
	const selected = useQuery(traits.Selected)
	const motionServices = useResourceNames(() => partID.current, 'motion')

	const hasMotionService = $derived(
		motionServices.current.some(
			(resource) => resource.type === 'service' && resource.subtype === 'motion'
		)
	)

	/**
	 * Move mode swaps the details panel for a move panel per selected frame, so the
	 * selection drives the panels the way it drives details in the other modes. The
	 * world root has no pose of its own to move.
	 */
	const movableFrames = $derived(
		selected.current.flatMap((entity) => {
			const frameName = entity.get(traits.Name)

			if (frameName === undefined || frameName === 'world' || !entity.has(traits.FramesAPI)) {
				return []
			}

			return [{ entity, frameName }]
		})
	)

	const isMoveMode = $derived(environment.current.mode === 'move')

	// Without a motion service there is nothing to move, so the mode goes away with
	// it rather than stranding the app in a mode that can't act.
	$effect(() => {
		if (!hasMotionService && environment.current.mode === 'move') {
			environment.current.mode = 'monitor'
		}
	})
</script>

{#if hasMotionService}
	<ModeTogglePortal>
		<ModeButton
			class="-ml-px rounded-l-none"
			mode="move"
			icon="move-3d"
			description="Move frames with the motion service"
		/>
	</ModeTogglePortal>
{/if}

{#if isMoveMode}
	{#each movableFrames as { entity, frameName } (frameName)}
		<MoveControls
			{frameName}
			onClose={() => {
				if (entity.isAlive()) entity.remove(traits.Selected)
			}}
		/>
	{/each}

	{#if movableFrames.length > 0}
		<World autoStart={false}>
			<CollisionDetector />
		</World>
	{/if}
{/if}
