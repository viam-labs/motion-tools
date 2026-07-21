import type { ResourceName } from '@viamrobotics/sdk'
import type { ResourceAPIWidget } from '@viamrobotics/test-widgets/registry'

import type { OpenResourceWidget } from '$lib/hooks/useSettings.svelte'

import { usePartID } from '$lib/hooks/usePartID.svelte'
import { useResourceByName } from '$lib/hooks/useResourceByName.svelte'
import { useSettings } from '$lib/hooks/useSettings.svelte'
import { resourceWidgetToggles } from '$lib/widgets/resourceWidgetToggles'

export interface ResolvedResourceWidget {
	key: string
	resource: ResourceName
	widgetId: string
	label: string
	widgets: ResourceAPIWidget['widgets']
}

/** Stable, unambiguous each-key for an open widget (resource names may contain ':'). */
const widgetKey = (resourceName: string, widgetId: string) => `${resourceName}__${widgetId}`

/** Whether a specific (resource, widget) toggle is present in the open list. */
export const isWidgetOpen = (
	list: OpenResourceWidget[],
	resourceName: string,
	widgetId: string
): boolean => list.some((w) => w.resourceName === resourceName && w.widgetId === widgetId)

/** Add a toggle to the open list (no-op if already present). */
export const addWidget = (
	list: OpenResourceWidget[],
	resourceName: string,
	widgetId: string
): OpenResourceWidget[] =>
	isWidgetOpen(list, resourceName, widgetId) ? list : [...list, { resourceName, widgetId }]

/** Remove a toggle from the open list. */
export const removeWidget = (
	list: OpenResourceWidget[],
	resourceName: string,
	widgetId: string
): OpenResourceWidget[] =>
	list.filter((w) => !(w.resourceName === resourceName && w.widgetId === widgetId))

/**
 * Resolves the persisted open-widget list for the current part into renderable
 * registry components. Entries whose resource is momentarily absent (reconnect) or
 * whose widget id no longer exists are skipped from rendering but kept in settings,
 * so panels reappear when the resource returns.
 *
 * Must be called inside `<SceneProviders>`, where `provideResourceByName` runs.
 */
export const useResourceWidgets = () => {
	const settings = useSettings()
	const partID = usePartID()
	const resourceByName = useResourceByName()

	const current = $derived.by(() => {
		const open = settings.current.openResourceWidgets[partID.current] ?? []
		const resolved: ResolvedResourceWidget[] = []

		for (const entry of open) {
			const resource = resourceByName.current[entry.resourceName]
			if (!resource) continue

			const toggle = resourceWidgetToggles(resource).find((option) => option.id === entry.widgetId)
			if (!toggle) continue

			resolved.push({
				key: widgetKey(entry.resourceName, entry.widgetId),
				resource,
				widgetId: entry.widgetId,
				label: toggle.label,
				widgets: toggle.widgets,
			})
		}

		return resolved
	})

	return {
		get current() {
			return current
		},
	}
}
