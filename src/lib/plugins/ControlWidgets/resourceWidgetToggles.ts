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
 * no per-API widgets.
 */
export const CARD_WIDGET_ID = '__resource_card__'

/**
 * The widget toggles to offer for a resource:
 *
 *  - A resource with per-API widgets shows those.
 *  - A resource without falls back to a single composite card toggle when the
 *    registry says to surface one.
 *  - Anything unwidgetable returns `[]` and is hidden from the list.
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
