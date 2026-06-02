<script lang="ts">
	import { traits, useWorld } from '$lib/ecs'
	import { useSelectedEntity } from '$lib/hooks/useSelection.svelte'
	import MeasurePoint from '$lib/plugins/MeasureTool/MeasurePoint.svelte'

	import { cursorPoint } from '../cursor'
	import { planeMatrix } from '../matrix'
	import { confirmPending, spawnPending } from '../spawn'
	import { ReferencePlane } from '../traits'
	import { useGizmos } from '../useGizmos.svelte'
	import { usePlace } from '../usePlace.svelte'

	const world = useWorld()
	const selectedEntity = useSelectedEntity()
	const gizmos = useGizmos()
	const place = usePlace(() => ({
		findHit: cursorPoint,
		onPlace: (position) => {
			const entity = spawnPending(world, {
				kind: 'reference plane',
				position,
				matrix: planeMatrix(gizmos.planeAxis, position),
				traits: [ReferencePlane, traits.Opacity(0.7)],
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
