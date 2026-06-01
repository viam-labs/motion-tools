<script lang="ts">
	import { traits, useQuery } from '$lib/ecs'

	import Label from './Label.svelte'

	const entities = useQuery(traits.Name)
</script>

{#each entities.current as entity (entity)}
	<Label {entity} />
{/each}
