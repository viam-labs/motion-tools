<script lang="ts">
	import { useXR } from '@threlte/xr'
	import { PersistedState } from 'runed'

	import { WorkspacePortal } from '$lib'
	import DashboardButton from '$lib/components/overlay/dashboard/Button.svelte'
	import FloatingPanel from '$lib/components/overlay/FloatingPanel.svelte'

	import ResourceWidgetList from './ResourceWidgetList.svelte'
	import ResourceWidgetPanel from './ResourceWidgetPanel.svelte'
	import { useResourceWidgets } from './useResourceWidgets.svelte'

	const isOpen = new PersistedState('control-widgets-is-open', false)
	const { isPresenting } = useXR()
	const resolved = useResourceWidgets()
</script>

<WorkspacePortal>
	<fieldset>
		<DashboardButton
			active={isOpen.current}
			icon="toggle-switch"
			description="Control widgets"
			onclick={() => {
				isOpen.current = !isOpen.current
			}}
		/>
	</fieldset>
</WorkspacePortal>

<FloatingPanel
	title="Control widgets"
	bind:isOpen={isOpen.current}
	defaultSize={{ width: 320, height: 480 }}
	resizable
>
	<div class="h-full overflow-y-auto p-2">
		<ResourceWidgetList />
	</div>
</FloatingPanel>

<!-- Registry widget panels render only outside XR. -->
{#if !$isPresenting}
	{#each resolved.current as widget, stackIndex (widget.key)}
		<ResourceWidgetPanel
			resource={widget.resource}
			widgetId={widget.widgetId}
			widgets={widget.widgets}
			title={`${widget.resource.name} · ${widget.label}`}
			{stackIndex}
		/>
	{/each}
{/if}
