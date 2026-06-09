<script lang="ts">
	import { asRGB } from '$lib/buffer'
	import { traits, useWorld } from '$lib/ecs'
	import MeasurePoint from '$lib/plugins/MeasureTool/MeasurePoint.svelte'

	import { cursorPoint } from '../cursor'
	import { planeMatrix } from '../matrix'
	import { selectOnly } from '../selection'
	import {
		confirmPending,
		REFERENCE_GEOMETRY_COLOR,
		REFERENCE_GEOMETRY_OPACITY,
		spawnPending,
	} from '../spawn'
	import { Plane } from '../traits'
	import { useGizmos } from '../useGizmos.svelte'
	import { usePlace } from '../usePlace.svelte'

	const world = useWorld()
	const gizmos = useGizmos()
	const place = usePlace(() => ({
		findHit: cursorPoint,
		onPlace: (position) => {
			const entity = spawnPending(world, {
				kind: 'reference plane',
				position,
				matrix: planeMatrix(gizmos.planeAxis, position),
				traits: [
					Plane,
					traits.Color(asRGB(REFERENCE_GEOMETRY_COLOR, { r: 0, g: 0, b: 0 })),
					traits.Opacity(gizmos.isWireframe ? 0 : REFERENCE_GEOMETRY_OPACITY),
					traits.ShowAxesHelper,
				],
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
