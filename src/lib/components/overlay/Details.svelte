<script lang="ts">
	import type { HTMLAttributes } from 'svelte/elements'

	import { type Entity } from 'koota'

	import BuildDetails from '$lib/components/overlay/details/BuildDetails.svelte'
	import MonitorDetails from '$lib/components/overlay/details/MonitorDetails.svelte'
	import { useEnvironment } from '$lib/hooks/useEnvironment.svelte'

	interface Props extends HTMLAttributes<HTMLDivElement> {
		entity: Entity
	}

	const { entity, ...rest }: Props = $props()

	const environment = useEnvironment()
</script>

{#if environment.current.mode === 'monitor'}
	<MonitorDetails
		{entity}
		{...rest}
	/>
{:else if environment.current.mode === 'build'}
	<BuildDetails
		{entity}
		{...rest}
	/>
{/if}
