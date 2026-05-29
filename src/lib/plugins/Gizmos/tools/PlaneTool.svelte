<script lang="ts">
	import { Vector3 } from 'three'

	import MeasurePoint from '$lib/components/MeasureTool/MeasurePoint.svelte'
	import { traits, useWorld } from '$lib/ecs'
	import { useMouseRaycaster } from '$lib/hooks/useMouseRaycaster.svelte'
	import { useSelectedEntity } from '$lib/hooks/useSelection.svelte'

	import { cursorPoint } from '../cursor'
	import { planeMatrix } from '../planeMatrix'
	import { confirmPending, spawnPending } from '../spawn'
	import { ReferencePlane } from '../traits'
	import { useCancelGesture, useGizmosPlugin } from '../useGizmosPlugin.svelte'

	const world = useWorld()
	const selectedEntity = useSelectedEntity()
	const plugin = useGizmosPlugin()

	let cursor = $state.raw<Vector3 | undefined>()

	const { onclick, onmove, raycaster } = useMouseRaycaster(() => ({ enabled: true }))
	raycaster.firstHitOnly = true

	useCancelGesture(() => plugin.exit())

	onmove((event) => {
		cursor = cursorPoint(event.intersections)
	})

	onclick(async (event) => {
		const position = cursorPoint(event.intersections)
		if (!position) return

		const entity = spawnPending(world, {
			kind: 'reference plane',
			position,
			matrix: planeMatrix(plugin.planeAxis, position),
			traits: [ReferencePlane({ width: 500, height: 500 }), traits.Opacity(0.7)],
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
