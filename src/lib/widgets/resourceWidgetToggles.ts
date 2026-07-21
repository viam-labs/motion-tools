import type { ResourceName } from '@viamrobotics/sdk'

import {
	apiWidgetsForResource,
	type ResourceAPIWidget,
	widgetForResource,
} from '@viamrobotics/test-widgets/registry'

/**
 * Reserved widget id for a resource's composite "card" widget. Used as the
 * {@link ResourceAPIWidget.id} for the fallback toggle shown when a resource has
 * no per-API widgets (e.g. camera, sensor).
 */
export const CARD_WIDGET_ID = '__resource_card__'

/**
 * The widget toggles to offer for a resource — the single source of truth shared
 * by the settings switches and the rendered panels so they never drift.
 *
 * Only component-type resources get widgets: services (motion, navigation, slam,
 * vision, …) are not represented in the visualizer, so they are excluded here.
 *
 * Honors "card only when no APIs": a component with per-API widgets shows those
 * (and no card); a component without falls back to a single composite card toggle;
 * anything unwidgetable returns `[]` (and is hidden from the settings list).
 */
export const resourceWidgetToggles = (resource: ResourceName): ResourceAPIWidget[] => {
	if (resource.type !== 'component') {
		return []
	}

	const apis = apiWidgetsForResource(resource)
	if (apis.length > 0) {
		return apis
	}

	// A component with a card but no per-API widgets (camera, sensor, …) gets one
	// "Overview" toggle. `rdk-internal` resources are never surfaced — this inlines the
	// component-relevant clause of the registry's `showResourceWidget` (a one-line
	// namespace check) so this module needs only the registry's widget lookups.
	const card = widgetForResource(resource)
	if (card && resource.namespace !== 'rdk-internal') {
		return [{ id: CARD_WIDGET_ID, label: 'Overview', widgets: [card] }]
	}

	return []
}
