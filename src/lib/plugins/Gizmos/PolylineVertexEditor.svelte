<script lang="ts">
	import { untrack } from 'svelte'

	import { traits, useQuery, useTrait } from '$lib/ecs'

	import PolylineVertexHandles from './PolylineVertexHandles.svelte'
	import PolylineVertexTransformControls from './PolylineVertexTransformControls.svelte'
	import { Gizmo, PendingGizmo } from './traits'
	import { useSelectedPolylineVertex } from './useSelectedPolylineVertex.svelte'

	const selected = useQuery(traits.Selected)
	const vertex = useSelectedPolylineVertex()

	const entity = $derived(selected.current[0])
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

	$effect(() => {
		if (!vertex.current) return
		if (vertex.current.entity !== entity || !editable) {
			untrack(() => vertex.set(undefined))
		}
	})
</script>

{#if editable && entity}
	<PolylineVertexHandles {entity} />
	<PolylineVertexTransformControls {entity} />
{/if}
