import type { ResourceName } from '@viamrobotics/sdk'

import { getResourceAPI, ResourceTriplets, showResourceWidget } from '@viamrobotics/test-widgets'
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

/** Widget id for the motion service's Move control. */
export const MOTION_MOVE_WIDGET_ID = 'move'

/**
 * The registry (`showResourceWidget`) hides the built-in motion service to match the
 * Viam app's control page, which omits it so users aren't confused by a control for a
 * service they never added to their config. In these tools the motion service is a
 * first-class control, so we surface it despite that filter.
 */
const isMotionService = (resource: ResourceName): boolean =>
	getResourceAPI(resource) === ResourceTriplets.Motion

/**
 * The widget toggles to offer for a resource:
 *
 *  - A resource with per-API widgets shows those.
 *  - The motion service surfaces its Move control. The registry lists no per-API
 *    widgets for motion, but its card is the frame-aware Move widget the MoveFrame
 *    plugin also uses, so we offer it here as a "Move" option (see {@link isMotionService}).
 *  - Any other resource falls back to a single composite card toggle when the registry
 *    says to surface one.
 *  - Anything unwidgetable returns `[]` and is hidden from the list.
 */
export const resourceWidgetToggles = (resource: ResourceName): ResourceAPIWidget[] => {
	const apis = apiWidgetsForResource(resource)
	if (apis.length > 0) {
		return apis
	}

	const card = widgetForResource(resource)
	if (!card) {
		return []
	}

	if (isMotionService(resource)) {
		return [{ id: MOTION_MOVE_WIDGET_ID, label: 'Move', widgets: [card] }]
	}

	if (showResourceWidget(resource)) {
		return [{ id: CARD_WIDGET_ID, label: 'Overview', widgets: [card] }]
	}

	return []
}
