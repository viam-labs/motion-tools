<script lang="ts">
	import type { ResourceName } from '@viamrobotics/sdk'
	import type { ResourceAPIWidget } from '@viamrobotics/test-widgets'

	import { useThrelte } from '@threlte/core'

	import FloatingPanel from '$lib/components/overlay/FloatingPanel.svelte'
	import { usePartID } from '$lib/hooks/usePartID.svelte'

	import ResourceTypeBadge from './ResourceTypeBadge.svelte'
	import { useControlWidgets, type WidgetRect } from './useControlWidgets.svelte'

	interface Props {
		resource: ResourceName
		widgetId: string
		widgets: ResourceAPIWidget['widgets']
		title: string
		stackIndex: number
	}

	const { resource, widgetId, widgets, title, stackIndex }: Props = $props()

	const store = useControlWidgets()
	const partID = usePartID()
	const { dom } = useThrelte()

	const DEFAULT_SIZE = { width: 340, height: 420 }
	const CASCADE_STEP = 40

	const savedRect = $derived(store.rectFor(partID.current, resource.name, widgetId))
	const defaultPosition = $derived(
		savedRect
			? { x: savedRect.x, y: savedRect.y }
			: {
					x: Math.max(16, dom.clientWidth - DEFAULT_SIZE.width - 16),
					y: 48 + (stackIndex % 8) * CASCADE_STEP,
				}
	)

	const defaultSize = $derived(
		savedRect ? { width: savedRect.width, height: savedRect.height } : DEFAULT_SIZE
	)

	const currentRect = $derived(savedRect ?? { ...defaultPosition, ...defaultSize })

	let isOpen = $state(true)

	// Sync panel close back to the plugin store (removes this widget from the open list).
	$effect(() => {
		if (isOpen) return
		store.setOpen(partID.current, resource.name, widgetId, false)
	})

	const saveRect = (rect: WidgetRect) => {
		store.saveRect(partID.current, resource.name, widgetId, rect)
	}
</script>

<FloatingPanel
	{title}
	bind:isOpen
	resizable
	{defaultPosition}
	{defaultSize}
	onPositionChangeEnd={(details) =>
		saveRect({ ...currentRect, x: details.position.x, y: details.position.y })}
	onSizeChangeEnd={(details) =>
		saveRect({ ...currentRect, width: details.size.width, height: details.size.height })}
>
	{#snippet headerPrefix()}
		<ResourceTypeBadge subtype={resource.subtype} />
	{/snippet}

	<div class="flex h-full flex-col gap-2 overflow-y-auto p-2 text-xs">
		{#each widgets as Widget, index (index)}
			<Widget
				partID={partID.current}
				resourceName={resource.name}
			/>
		{/each}
	</div>
</FloatingPanel>
