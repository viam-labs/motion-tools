<script lang="ts">
	import { Vector3 } from 'three'

	import { asRGB } from '$lib/buffer'
	import { traits, useWorld } from '$lib/ecs'
	import { useMouseRaycaster } from '$lib/hooks/useMouseRaycaster.svelte'
	import { useSelectedEntity } from '$lib/hooks/useSelection.svelte'

	import MeasurePoint from '../../../components/MeasureTool/MeasurePoint.svelte'
	import { cursorPoint } from '../cursor'
	import {
		confirmPending,
		REFERENCE_GEOMETRY_COLOR,
		REFERENCE_GEOMETRY_OPACITY,
		spawnPending,
	} from '../spawn'
	import { useCancelGesture, useGizmosPlugin } from '../useGizmosPlugin.svelte'

	const world = useWorld()
	const selectedEntity = useSelectedEntity()
	const plugin = useGizmosPlugin()

	let cursor = $state.raw<Vector3 | undefined>()

	const { onclick, onmove, raycaster } = useMouseRaycaster(() => ({ enabled: true }))
	raycaster.firstHitOnly = true

	useCancelGesture(plugin.exit)

	onmove((event) => {
		cursor = cursorPoint(event.intersections)
	})

	onclick(async (event) => {
		const position = cursorPoint(event.intersections)
		if (!position) return

		const entity = spawnPending(world, {
			kind: `reference ${plugin.geometryShape}`,
			position,
			traits: [
				plugin.geometryTrait,
				traits.Color(asRGB(REFERENCE_GEOMETRY_COLOR, { r: 0, g: 0, b: 0 })),
				traits.Opacity(plugin.isGeometryWireframe ? 0 : REFERENCE_GEOMETRY_OPACITY),
			],
		})

		confirmPending(entity)
		selectedEntity.set(entity)
		plugin.exit()
	})
</script>

{#if cursor}
	<MeasurePoint
		position={cursor.toArray()}
		opacity={0.5}
	/>
{/if}
