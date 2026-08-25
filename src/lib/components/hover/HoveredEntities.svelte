<script lang="ts">
	import { traits, useQuery } from '$lib/ecs'
	import { useLinkedEntities } from '$lib/hooks/useLinked.svelte'

	import HoveredEntity from './HoveredEntity.svelte'
	import HoveredPointMarker from './HoveredPointMarker.svelte'
	import LinkedHoveredEntity from './LinkedHoveredEntity.svelte'

	const linkedEntities = useLinkedEntities()

	// `InstancedMatrix` rather than `Hovered`: it carries the hovered sub-element these components
	// read, and an instanced renderer can drop `Hovered` while leaving the matrix in place.
	const hovered = useQuery(traits.Selected, traits.InstancedMatrix)
</script>

{#each hovered.current as entity (entity)}
	<HoveredPointMarker {entity} />
	<HoveredEntity {entity} />

	{#each linkedEntities.current as linkedEntity (linkedEntity)}
		<LinkedHoveredEntity
			{linkedEntity}
			{entity}
		/>
	{/each}
{/each}
