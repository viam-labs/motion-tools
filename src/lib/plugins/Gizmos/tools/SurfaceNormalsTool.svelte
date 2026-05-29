<script lang="ts">
	import type { Entity } from 'koota'

	import { asRGB } from '$lib/buffer'
	import { relations, traits, useWorld } from '$lib/ecs'
	import { useMouseRaycaster } from '$lib/hooks/useMouseRaycaster.svelte'
	import { useSelectedEntity } from '$lib/hooks/useSelection.svelte'

	import { spawnGizmo, SURFACE_NORMALS_COLOR } from '../spawn'
	import { findSurfaceEntityForObject } from '../surface'
	import { SurfaceNormals } from '../traits'
	import { useCancelGesture, useGizmosPlugin } from '../useGizmosPlugin.svelte'

	const world = useWorld()
	const selectedEntity = useSelectedEntity()
	const plugin = useGizmosPlugin()

	let hovered = $state.raw<Entity>()

	const { onclick, onmove, raycaster } = useMouseRaycaster(() => ({ enabled: true }))
	raycaster.firstHitOnly = true

	useCancelGesture(plugin.exit)

	onmove((event) => {
		hovered = undefined
		for (const intersection of event.intersections) {
			const entity = findSurfaceEntityForObject(world, intersection.object)
			if (entity !== undefined) {
				hovered = entity
				break
			}
		}
	})

	onclick(() => {
		if (hovered === undefined) return

		const entity = spawnGizmo(world, {
			kind: 'surface normals',
			traits: [
				SurfaceNormals({ length: plugin.surfaceNormalLength }),
				traits.Color(asRGB(SURFACE_NORMALS_COLOR, { r: 0, g: 0, b: 0 })),
				relations.ChildOf(hovered),
			],
		})

		selectedEntity.set(entity)
		plugin.exit()
	})
</script>
