<script lang="ts">
	import type { Entity } from 'koota'

	import { type Vector3 } from 'three'

	import { asRGB } from '$lib/buffer'
	import { relations, traits, useWorld } from '$lib/ecs'
	import { useMouseRaycaster } from '$lib/hooks/useMouseRaycaster.svelte'
	import { useSelectedEntity } from '$lib/hooks/useSelection.svelte'

	import { spawnGizmo, VERTEX_NORMALS_COLOR } from '../spawn'
	import { findSurfaceHit } from '../surface'
	import SurfacePickerCursor from '../SurfacePickerCursor.svelte'
	import { VertexNormals } from '../traits'
	import { useCancelGesture, useGizmosPlugin } from '../useGizmosPlugin.svelte'

	const world = useWorld()
	const selectedEntity = useSelectedEntity()
	const plugin = useGizmosPlugin()

	let hovered = $state.raw<Entity>()
	let hoveredPosition = $state.raw<Vector3>()

	const { onclick, onmove, raycaster } = useMouseRaycaster(() => ({ enabled: true }))
	raycaster.firstHitOnly = true

	useCancelGesture(plugin.exit)

	onmove((event) => {
		const hit = findSurfaceHit(world, event.intersections)
		if (hit) {
			hovered = hit.entity
			hoveredPosition = hit.position
		} else {
			hovered = undefined
			hoveredPosition = undefined
		}
	})

	onclick(() => {
		if (hovered === undefined) return

		const entity = spawnGizmo(world, {
			kind: 'vertex normals',
			traits: [
				VertexNormals({ length: plugin.vertexNormalsLength }),
				traits.Color(asRGB(VERTEX_NORMALS_COLOR, { r: 0, g: 0, b: 0 })),
				relations.ChildOf(hovered),
			],
		})

		selectedEntity.set(entity)
		plugin.exit()
	})
</script>

{#if hovered !== undefined && hoveredPosition}
	<SurfacePickerCursor
		entity={hovered}
		position={hoveredPosition.toArray()}
	/>
{/if}
