<script lang="ts">
	import Label from '$lib/components/Entities/Label.svelte'
	import { useQuery } from '$lib/ecs'

	import GizmoArrow from './GizmoArrow.svelte'
	import GizmoNormals from './GizmoNormals.svelte'
	import GizmoPlane from './GizmoPlane.svelte'
	import GizmoPolylineMeasure from './GizmoPolylineMeasure.svelte'
	import * as gizmoTraits from './traits'

	const planeGizmos = useQuery(gizmoTraits.Plane)
	const arrowGizmos = useQuery(gizmoTraits.GizmoArrow)
	const polylineMeasures = useQuery(gizmoTraits.PolylineMeasure)
	const vertexNormals = useQuery(gizmoTraits.VertexNormals)
	const surfaceNormals = useQuery(gizmoTraits.SurfaceNormals)
</script>

{#each planeGizmos.current as entity (entity)}
	<GizmoPlane {entity}>
		<Label {entity} />
	</GizmoPlane>
{/each}

{#each arrowGizmos.current as entity (entity)}
	<GizmoArrow {entity}>
		<Label {entity} />
	</GizmoArrow>
{/each}

{#each polylineMeasures.current as entity (entity)}
	<GizmoPolylineMeasure {entity} />
{/each}

{#each vertexNormals.current as entity (entity)}
	<GizmoNormals
		{entity}
		kind="vertex"
	/>
{/each}

{#each surfaceNormals.current as entity (entity)}
	<GizmoNormals
		{entity}
		kind="surface"
	/>
{/each}
