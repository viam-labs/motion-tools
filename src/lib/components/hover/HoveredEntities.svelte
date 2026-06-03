<script lang="ts">
	import { traits, useQuery, useTrait } from '$lib/ecs'
	import { useLinkedEntities } from '$lib/hooks/useLinked.svelte'

	import HoveredEntity from './HoveredEntity.svelte'
	import LinkedHoveredEntity from './LinkedHoveredEntity.svelte'

	const linkedEntities = useLinkedEntities()
	const selected = useQuery(traits.Selected)
</script>

{#each selected.current as entity (entity)}
	{@const isHovered = useTrait(() => entity, traits.Hovered)}

	{#if isHovered}
		<HoveredEntity {entity} />

		{#each linkedEntities.current as linkedEntity (linkedEntity)}
			<LinkedHoveredEntity
				{linkedEntity}
				{entity}
			/>
		{/each}
	{/if}
{/each}
