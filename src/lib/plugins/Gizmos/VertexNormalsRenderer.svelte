<script lang="ts">
	import { useQuery } from '$lib/ecs'

	import * as gizmoTraits from './traits'
	import VertexNormalsEntity from './VertexNormalsEntity.svelte'

	const entities = useQuery(gizmoTraits.VertexNormals)
</script>

{#each entities.current as entity (entity)}
	<VertexNormalsEntity {entity} />
{/each}
