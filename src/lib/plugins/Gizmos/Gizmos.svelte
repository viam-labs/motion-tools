<script lang="ts">
	import { Portal } from '@threlte/extras'
	import { untrack } from 'svelte'

	import DashboardButton from '$lib/components/overlay/dashboard/Button.svelte'
	import Popover from '$lib/components/overlay/Popover.svelte'
	import { useSettings } from '$lib/hooks/useSettings.svelte'

	import GizmoDetails from './GizmoDetails.svelte'
	import GizmoEntities from './GizmoEntities.svelte'
	import GizmoMenu from './GizmoMenu.svelte'
	import { GizmoModes } from './gizmos'
	import ArrowTool from './tools/ArrowTool.svelte'
	import CoordinateSystemTool from './tools/CoordinateSystemTool.svelte'
	import GeometryTool from './tools/GeometryTool.svelte'
	import LineTool from './tools/LineTool.svelte'
	import NormalsTool from './tools/NormalsTool.svelte'
	import PlaneTool from './tools/PlaneTool.svelte'
	import { provideGizmos } from './useGizmos.svelte'

	const settings = useSettings()
	const gizmos = provideGizmos(() => toggleOff())

	const isGizmoMode = $derived(settings.current.interactionMode === 'gizmo')
	$effect(() => {
		if (isGizmoMode) return
		untrack(() => {
			if (gizmos.mode !== 'idle') gizmos.mode = 'idle'
		})
	})

	const toggleOff = () => {
		settings.current.interactionMode = 'navigate'
		gizmos.mode = 'idle'
	}
</script>

<Portal id="dashboard">
	<div class="relative">
		<Popover>
			{#snippet trigger(triggerProps, { isOpen })}
				<DashboardButton
					{...triggerProps}
					active={isGizmoMode || isOpen}
					icon="shapes"
					description={isGizmoMode ? `Gizmo: ${gizmos.mode}` : 'Add gizmo'}
					disableTooltip={isGizmoMode}
				/>
			{/snippet}

			{#snippet children({ close })}
				<GizmoMenu {close} />
			{/snippet}
		</Popover>
	</div>
</Portal>

{#if isGizmoMode}
	{#if gizmos.mode === GizmoModes.CoordinateSystem}
		<CoordinateSystemTool />
	{:else if gizmos.mode === GizmoModes.ReferencePlane}
		<PlaneTool />
	{:else if gizmos.mode === GizmoModes.ReferenceGeometry}
		<GeometryTool />
	{:else if gizmos.mode === GizmoModes.Polyline}
		<LineTool />
	{:else if gizmos.mode === GizmoModes.Arrow}
		<ArrowTool />
	{:else if gizmos.mode === GizmoModes.VertexNormals}
		<NormalsTool kind="vertex" />
	{:else if gizmos.mode === GizmoModes.SurfaceNormals}
		<NormalsTool kind="surface" />
	{/if}
{/if}

<GizmoEntities />

{#if isGizmoMode}
	<GizmoDetails />
{/if}
