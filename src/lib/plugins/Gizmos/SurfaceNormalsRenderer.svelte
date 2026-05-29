<script lang="ts">
	import { useQuery } from '$lib/ecs'

	import SurfaceNormalsEntity from './SurfaceNormalsEntity.svelte'
	import * as gizmoTraits from './traits'

	const entities = useQuery(gizmoTraits.SurfaceNormals)
</script>

{#each entities.current as entity (entity)}
	<SurfaceNormalsEntity {entity} />
{/each}
