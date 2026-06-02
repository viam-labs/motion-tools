<script lang="ts">
	import { traits, useWorld } from '$lib/ecs'
	import MeasurePoint from '$lib/plugins/MeasureTool/MeasurePoint.svelte'

	import { cursorPoint } from '../cursor'
	import { selectOnly } from '../selection'
	import { confirmPending, spawnPending } from '../spawn'
	import { useGizmos } from '../useGizmos.svelte'
	import { usePlace } from '../usePlace.svelte'

	const world = useWorld()
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
			selectOnly(world, entity)
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
