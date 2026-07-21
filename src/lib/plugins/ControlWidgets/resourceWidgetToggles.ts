import type { ResourceName } from '@viamrobotics/sdk'

import { showResourceWidget } from '@viamrobotics/test-widgets'
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
 * by the switch list and the rendered panels so they never drift.
 *
 * Components and services alike are offered: a resource with per-API widgets shows
 * those (and no card); a resource without falls back to a single composite card
 * toggle when the registry says to surface one ({@link showResourceWidget} hides
 * `rdk-internal` resources and cardless services like data manager / shell). The
 * motion service still appears via its per-API move widget. Anything unwidgetable
 * returns `[]` (and is hidden from the list).
 */
export const resourceWidgetToggles = (resource: ResourceName): ResourceAPIWidget[] => {
	const apis = apiWidgetsForResource(resource)
	if (apis.length > 0) {
		return apis
	}

	const card = widgetForResource(resource)
	if (card && showResourceWidget(resource)) {
		return [{ id: CARD_WIDGET_ID, label: 'Overview', widgets: [card] }]
	}

	return []
}
