<script lang="ts">
	import type { Snippet } from 'svelte'
	import type { HTMLAttributes } from 'svelte/elements'

	import { type Entity } from 'koota'

	import BuildDetails from '$lib/components/overlay/details/BuildDetails.svelte'
	import MonitorDetails from '$lib/components/overlay/details/MonitorDetails.svelte'
	import { useEnvironment } from '$lib/hooks/useEnvironment.svelte'

	interface Props extends HTMLAttributes<HTMLDivElement> {
		entity: Entity
		details?: Snippet<[{ entity: Entity }]>
	}

	const { entity, details, ...rest }: Props = $props()

	const environment = useEnvironment()
</script>

{#if environment.current.mode === 'monitor'}
	<MonitorDetails
		{entity}
		{details}
		{...rest}
	/>
{:else if environment.current.mode === 'build'}
	<BuildDetails
		{entity}
		{details}
		{...rest}
	/>
{/if}
