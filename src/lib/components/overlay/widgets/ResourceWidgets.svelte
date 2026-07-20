<script lang="ts">
	import { useResourceWidgets } from '$lib/hooks/useResourceWidgets.svelte'

	import ResourceWidgetPanel from './ResourceWidgetPanel.svelte'

	const resolved = useResourceWidgets()
</script>

{#each resolved.current as widget, stackIndex (widget.key)}
	<ResourceWidgetPanel
		resource={widget.resource}
		widgetId={widget.widgetId}
		widgets={widget.widgets}
		title={`${widget.resource.name} · ${widget.label}`}
		{stackIndex}
	/>
{/each}
