<script lang="ts">
	import { useQuery } from '$lib/ecs'

	import PolylineMeasureEntity from './PolylineMeasureEntity.svelte'
	import * as gizmoTraits from './traits'

	const entities = useQuery(gizmoTraits.PolylineMeasure)
</script>

{#each entities.current as entity (entity)}
	<PolylineMeasureEntity {entity} />
{/each}
