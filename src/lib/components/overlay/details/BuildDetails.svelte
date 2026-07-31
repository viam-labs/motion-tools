<script lang="ts">
	import type { Snippet } from 'svelte'
	import type { HTMLAttributes } from 'svelte/elements'

	import { PortalTarget } from '@threlte/extras'
	import { Button } from '@viamrobotics/prime-core'
	import { type Entity } from 'koota'

	import AddRelationship from '$lib/components/overlay/AddRelationship.svelte'
	import { traits, useTag, useTrait } from '$lib/ecs'
	import { FrameEditor } from '$lib/editing/FrameEditor'
	import { useEnvironment } from '$lib/hooks/useEnvironment.svelte'
	import { useFragmentInfo } from '$lib/hooks/useFragmentInfo.svelte'
	import { usePartConfig } from '$lib/hooks/usePartConfig.svelte'

	import AxesHelperDetails from './AxesHelperDetails.svelte'
	import ColorDetails from './ColorDetails.svelte'
	import CountDetails from './CountDetails.svelte'
	import DetailsPanel from './DetailsPanel.svelte'
	import DimensionsDetails from './DimensionsDetails.svelte'
	import EditGeometryDetails from './EditGeometryDetails.svelte'
	import OpacityDetails from './OpacityDetails.svelte'
	import PoseDetails from './PoseDetails.svelte'
	import RelationshipDetails from './RelationshipDetails.svelte'

	interface Props extends HTMLAttributes<HTMLDivElement> {
		entity: Entity
		details?: Snippet<[{ entity: Entity }]>
	}

	const { entity, details, ...rest }: Props = $props()

	const environment = useEnvironment()
	const fragmentInfo = useFragmentInfo()
	const partConfig = usePartConfig()

	const frameEditor = new FrameEditor(partConfig.updateFrame, partConfig.deleteFrame)

	const name = useTrait(() => entity, traits.Name)
	const points = useTrait(() => entity, traits.Points)
	const arrows = useTrait(() => entity, traits.Arrows)
	const framesAPI = useTrait(() => entity, traits.FramesAPI)
	const customDetails = useTag(() => entity, traits.CustomDetails)

	const isFragmentComponentWithVariables = $derived(
		name.current && Object.keys(fragmentInfo.current?.[name.current]?.variables ?? {}).length > 0
	)
	const showEditFrameOptions = $derived(
		!!framesAPI.current && partConfig.hasEditPermissions && !isFragmentComponentWithVariables
	)
	const showConfigUnavailableWarning = $derived(
		!!framesAPI.current && !partConfig.hasEditPermissions && partConfig.error !== undefined
	)
	const showRelationshipOptions = $derived(!!points.current || !!arrows.current)
</script>

<DetailsPanel
	{entity}
	{...rest}
>
	{#if isFragmentComponentWithVariables}
		<p
			class="mt-2 rounded border-l-4 border-yellow-600 bg-yellow-50 px-2 py-1.5 text-yellow-900"
			data-testid="fragment-variables-warning"
			role="status"
		>
			This component is from a fragment with variables, editing frames in 3D scene is disabled
		</p>
	{/if}

	{#if showConfigUnavailableWarning}
		<div
			class="mt-2 rounded border-l-4 border-yellow-600 bg-yellow-50 px-2 py-1.5 text-yellow-900"
			data-testid="config-unavailable-warning"
			role="status"
		>
			<p>Frame editing is disabled — this machine's configuration could not be read.</p>
			<p class="mt-1 break-words text-yellow-800">{partConfig.error}</p>
		</div>
	{/if}

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
				editable={showEditFrameOptions}
			/>
		{/if}

		{#if showEditFrameOptions}
			<EditGeometryDetails {entity} />
		{:else}
			<DimensionsDetails {entity} />
		{/if}

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

	{#if showRelationshipOptions || (showEditFrameOptions && environment.current.isStandalone)}
		<h3 class="text-subtle-2 pt-3 pb-2">Actions</h3>
	{/if}

	{#if showRelationshipOptions}
		<AddRelationship {entity} />
	{/if}

	{#if showEditFrameOptions && environment.current.isStandalone}
		<Button
			variant="danger"
			class="mt-2 w-full"
			onclick={() => frameEditor.deleteFrame(entity)}
		>
			Delete frame
		</Button>
	{/if}
</DetailsPanel>
