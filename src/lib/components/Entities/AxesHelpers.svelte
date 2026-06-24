<script lang="ts">
	import { Not } from 'koota'

	import { traits, useQuery } from '$lib/ecs'

	import AxesHelper from './AxesHelper.svelte'

	const entities = useQuery(traits.ShowAxesHelper, Not(traits.Invisible))
</script>

{#each entities.current as entity (entity)}
	<AxesHelper {entity} />
{/each}
