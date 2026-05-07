<script lang="ts">
	import type { HoverInfo } from '$lib/HoverUpdater.svelte'

	import { traits, useTrait } from '$lib/ecs'
	import { useFocusedEntity, useSelectedEntity } from '$lib/hooks/useSelection.svelte'
	import { createPose, matrixTraitToPose } from '$lib/transform'

	import HoveredEntityTooltip from './HoveredEntityTooltip.svelte'

	const selectedEntity = useSelectedEntity()
	const focusedEntity = useFocusedEntity()

	const displayEntity = $derived(selectedEntity.current ?? focusedEntity.current)
	const instancedMatrix = useTrait(() => displayEntity, traits.InstancedMatrix)

	const hoverInfo = $derived.by((): HoverInfo | undefined => {
		if (!instancedMatrix.current) return undefined
		const pose = matrixTraitToPose(instancedMatrix.current, createPose())
		return {
			index: instancedMatrix.current.index,
			x: pose.x,
			y: pose.y,
			z: pose.z,
			oX: pose.oX,
			oY: pose.oY,
			oZ: pose.oZ,
			theta: pose.theta,
		}
	})
</script>

{#if hoverInfo}
	<HoveredEntityTooltip {hoverInfo} />
{/if}
