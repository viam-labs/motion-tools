<script lang="ts">
	import { asRGB } from '$lib/buffer'
	import { traits, useWorld } from '$lib/ecs'
	import { useSelectedEntity } from '$lib/hooks/useSelection.svelte'
	import MeasurePoint from '$lib/plugins/MeasureTool/MeasurePoint.svelte'

	import { cursorPoint } from '../cursor'
	import {
		confirmPending,
		REFERENCE_GEOMETRY_COLOR,
		REFERENCE_GEOMETRY_OPACITY,
		spawnPending,
	} from '../spawn'
	import { useGizmos } from '../useGizmos.svelte'
	import { usePlace } from '../usePlace.svelte'

	const world = useWorld()
	const selectedEntity = useSelectedEntity()
	const gizmos = useGizmos()
	const place = usePlace(() => ({
		findHit: cursorPoint,
		onPlace: (position) => {
			const entity = spawnPending(world, {
				kind: `reference ${gizmos.geometryShape}`,
				position,
				traits: [
					gizmos.geometryTrait,
					traits.Color(asRGB(REFERENCE_GEOMETRY_COLOR, { r: 0, g: 0, b: 0 })),
					traits.Opacity(gizmos.isGeometryWireframe ? 0 : REFERENCE_GEOMETRY_OPACITY),
				],
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
