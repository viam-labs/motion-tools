<script lang="ts">
	import { Portal } from '@threlte/extras'
	import { Tooltip } from '@viamrobotics/prime-core'
	import { useResourceNames } from '@viamrobotics/svelte-sdk'
	import { Move3d } from 'lucide-svelte'

	import { traits, useQuery } from '$lib/ecs'
	import { usePartID } from '$lib/hooks/usePartID.svelte'

	import { isMotionService } from './moveControls'
	import MoveControls from './MoveControls.svelte'
	import { useOpenMoveWidgets } from './useOpenMoveWidgets.svelte'

	const partID = usePartID()
	const selected = useQuery(traits.Selected)
	const motionServices = useResourceNames(() => partID.current, 'motion')
	const moveWidgets = useOpenMoveWidgets(() => partID.current)

	const entity = $derived(selected.current[0])
	const frameName = $derived(entity?.get(traits.Name))
	const isFrame = $derived(entity !== undefined && entity.has(traits.FramesAPI))
	const hasMotionService = $derived(
		motionServices.current.some((resource) => isMotionService(resource))
	)

	const showButton = $derived(
		isFrame && frameName !== undefined && frameName !== 'world' && hasMotionService
	)

	const openMove = () => {
		if (frameName !== undefined) moveWidgets.open(frameName)
	}
</script>

{#if showButton}
	<Portal id="details-header-actions">
		<Tooltip
			let:tooltipID
			location="bottom"
		>
			<button
				class="text-subtle-2"
				aria-describedby={tooltipID}
				aria-label="Move this frame"
				onclick={openMove}
			>
				<Move3d size={14} />
			</button>
			<p slot="description">Move this frame</p>
		</Tooltip>
	</Portal>
{/if}

{#each moveWidgets.current as name (name)}
	<MoveControls
		frameName={name}
		onClose={() => moveWidgets.close(name)}
	/>
{/each}
