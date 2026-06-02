<script lang="ts">
	import { untrack } from 'svelte'

	import { traits, useTrait } from '$lib/ecs'
	import { useSelectedEntity } from '$lib/hooks/useSelection.svelte'

	import PolylineVertexHandles from './PolylineVertexHandles.svelte'
	import PolylineVertexTransformControls from './PolylineVertexTransformControls.svelte'
	import { Gizmo, PendingGizmo } from './traits'
	import { useSelectedPolylineVertex } from './useSelectedPolylineVertex.svelte'

	const selectedEntity = useSelectedEntity()
	const vertex = useSelectedPolylineVertex()

	const entity = $derived(selectedEntity.current)
	const gizmo = useTrait(() => entity, Gizmo)
	const pending = useTrait(() => entity, PendingGizmo)
	const linePositions = useTrait(() => entity, traits.LinePositions)
	const inheritedInvisible = useTrait(() => entity, traits.InheritedInvisible)

	const editable = $derived(
		!!entity &&
			!!gizmo.current &&
			!pending.current &&
			!!linePositions.current &&
			!inheritedInvisible.current
	)

	// Drop any stale vertex selection when the user picks a different entity,
	// hides the polyline, deletes it, or re-enters pending placement.
	$effect(() => {
		const sel = vertex.current
		const isEditable = editable
		const currentEntity = entity
		if (!sel) return
		if (sel.entity !== currentEntity || !isEditable) {
			untrack(() => vertex.set(undefined))
		}
	})
</script>

{#if editable && entity}
	<PolylineVertexHandles {entity} />
	<PolylineVertexTransformControls {entity} />
{/if}
