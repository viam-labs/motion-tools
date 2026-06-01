<script lang="ts">
	import MeasurePoint from '$lib/components/MeasureTool/MeasurePoint.svelte'
	import { traits, useWorld } from '$lib/ecs'
	import { useSelectedEntity } from '$lib/hooks/useSelection.svelte'

	import { cursorPoint } from '../cursor'
	import { confirmPending, spawnPending } from '../spawn'
	import { useGizmos } from '../useGizmos.svelte'
	import { usePlace } from '../usePlace.svelte'

	const world = useWorld()
	const selectedEntity = useSelectedEntity()
	const gizmos = useGizmos()
	const place = usePlace(() => ({
		findHit: cursorPoint,
		onPlace: (position) => {
			const entity = spawnPending(world, {
				kind: 'coordinate-system',
				position,
				traits: [traits.ReferenceFrame, traits.ShowAxesHelper],
			})
			confirmPending(entity)
			selectedEntity.set(entity)
			gizmos.exit()
		},
	}))
</script>

{#if place.current}
	<MeasurePoint
		position={place.current.toArray()}
		opacity={0.5}
	/>
{/if}
