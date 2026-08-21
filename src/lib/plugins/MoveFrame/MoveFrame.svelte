<script lang="ts">
	import { World } from '@threlte/rapier'

	import ModeTogglePortal from '$lib/components/overlay/Portals/ModeTogglePortal.svelte'
	import ModeButton from '$lib/components/overlay/workspace/ModeButton.svelte'
	import { traits, useQuery } from '$lib/ecs'
	import { useEnvironment, useEnvironmentMode } from '$lib/hooks/useEnvironment.svelte'

	import CollisionDetector from './collisions/CollisionDetector.svelte'
	import MoveControls from './MoveControls.svelte'
	import MoveDashboard from './MoveDashboard.svelte'

	const environment = useEnvironment()
	const selected = useQuery(traits.Selected)

	useEnvironmentMode('move')

	/**
	 * Move mode swaps the details panel for a move panel per selected frame, so the
	 * selection drives the panels the way it drives details in the other modes. The
	 * world root has no pose of its own to move, and a kinematic link is not a name
	 * the motion service can resolve — only the component that owns it is.
	 */
	const movableFrames = $derived(
		selected.current.flatMap((entity) => {
			const frameName = entity.get(traits.Name)

			if (
				frameName === undefined ||
				frameName === 'world' ||
				!entity.has(traits.FramesAPI) ||
				entity.has(traits.KinematicLink)
			) {
				return []
			}

			return [{ entity, frameName }]
		})
	)

	const isMoveMode = $derived(environment.current.mode === 'move')
</script>

<ModeTogglePortal>
	<ModeButton
		class="-ml-px rounded-l-none"
		mode="move"
		description="Execute movement with a motion service"
	/>
</ModeTogglePortal>

{#if isMoveMode}
	<MoveDashboard />

	{#each movableFrames as { entity, frameName }, index (frameName)}
		<MoveControls
			{entity}
			{frameName}
			style="transform: translate(0, {index * 40}px)"
		/>
	{/each}

	{#if movableFrames.length > 0}
		<World autoStart={false}>
			<CollisionDetector />
		</World>
	{/if}
{/if}
