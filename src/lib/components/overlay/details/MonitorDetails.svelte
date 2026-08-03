<script lang="ts">
	import type { Snippet } from 'svelte'
	import type { HTMLAttributes } from 'svelte/elements'

	import { PortalTarget } from '@threlte/extras'
	import { type Entity } from 'koota'

	import { traits, useTag } from '$lib/ecs'

	import AxesHelperDetails from './AxesHelperDetails.svelte'
	import ColorDetails from './ColorDetails.svelte'
	import CountDetails from './CountDetails.svelte'
	import DetailsPanel from './DetailsPanel.svelte'
	import DimensionsDetails from './DimensionsDetails.svelte'
	import OpacityDetails from './OpacityDetails.svelte'
	import PoseDetails from './PoseDetails.svelte'
	import RelationshipDetails from './RelationshipDetails.svelte'

	interface Props extends HTMLAttributes<HTMLDivElement> {
		entity: Entity
		details?: Snippet<[{ entity: Entity }]>
	}

	const { entity, details, ...rest }: Props = $props()

	const customDetails = useTag(() => entity, traits.CustomDetails)
</script>

<DetailsPanel
	{entity}
	{...rest}
>
	<h3
		class="text-subtle-2 pt-3 pb-2"
		data-testid="details-header"
	>
		Details
	</h3>

	<div class="flex flex-col gap-2.5">
		{#if !customDetails.current}
			<PoseDetails
				{entity}
				editable={false}
			/>
		{/if}

		<DimensionsDetails {entity} />

		<CountDetails {entity} />

		<PortalTarget id="details-extensions" />

		{#if !customDetails.current}
			<ColorDetails {entity} />
			<OpacityDetails {entity} />
			<AxesHelperDetails {entity} />
		{/if}
	</div>

	<RelationshipDetails {entity} />

	{@render details?.({ entity })}
</DetailsPanel>
