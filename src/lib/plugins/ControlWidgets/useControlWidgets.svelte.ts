import { PersistedState } from 'runed'

const open = new PersistedState<Record<string, OpenResourceWidget[]>>(
	'motion-tools:control-widgets',
	{}
)

const rects = new PersistedState<Record<string, WidgetRect>>(
	'motion-tools:control-widget-rects',
	{}
)

/** One open resource-API widget panel: a resource paired with a registry widget id. */
export interface OpenResourceWidget {
	resourceName: string
	widgetId: string
}

/** Persisted floating-panel rectangle for a resource widget (position + size). */
export interface WidgetRect {
	x: number
	y: number
	width: number
	height: number
}

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

export interface ControlWidgetsStore {
	/** Open (resource, widget) pairs for a part. */
	openFor(partID: string): OpenResourceWidget[]
	/** Whether a specific (resource, widget) toggle is open for a part. */
	isOpen(partID: string, resourceName: string, widgetId: string): boolean
	/** Open or close a specific (resource, widget) toggle for a part. */
	setOpen(partID: string, resourceName: string, widgetId: string, on: boolean): void
	/** The persisted panel rect for a widget, if any. */
	rectFor(partID: string, resourceName: string, widgetId: string): WidgetRect | undefined
	/** Persist a widget's panel rect. */
	saveRect(partID: string, resourceName: string, widgetId: string, rect: WidgetRect): void
}

/**
 * Self-contained state for the ControlWidgets plugin: which registry widget panels
 * are open per part, and their persisted geometry. Backed by localStorage so the
 * plugin owns its state without touching the central settings store.
 *
 * Returns methods over shared singletons, so every caller (the switch list, each
 * open panel, and the XR plugin) observes and mutates the same reactive state.
 */
export const useControlWidgets = (): ControlWidgetsStore => ({
	openFor: (partID) => open.current[partID] ?? [],

	isOpen: (partID, resourceName, widgetId) =>
		isWidgetOpen(open.current[partID] ?? [], resourceName, widgetId),

	setOpen: (partID, resourceName, widgetId, on) => {
		const list = open.current[partID] ?? []
		const next = on
			? addWidget(list, resourceName, widgetId)
			: removeWidget(list, resourceName, widgetId)

		// Length is unchanged only for no-ops (add-existing / remove-absent).
		if (next.length === list.length) return

		open.current = { ...open.current, [partID]: next }
	},

	rectFor: (partID, resourceName, widgetId) =>
		rects.current[rectKey(partID, resourceName, widgetId)],

	saveRect: (partID, resourceName, widgetId, rect) => {
		rects.current = { ...rects.current, [rectKey(partID, resourceName, widgetId)]: rect }
	},
})

const rectKey = (partID: string, resourceName: string, widgetId: string) =>
	`${partID} ${resourceName} ${widgetId}`
