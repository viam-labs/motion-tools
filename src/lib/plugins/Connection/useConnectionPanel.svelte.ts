import { getContext, setContext } from 'svelte'

const key = Symbol('connection-panel-context')

export interface ConnectionPanelContext {
	/** Whether the connection-config panel is open. Owned by `<ConnectionProvider>`. */
	isOpen: boolean
}

/**
 * Owns the open-state of the connection-config panel. Lives on the `<ConnectionProvider>`
 * wrapper so it can be read by the wrapper (to drive `inputBindingsEnabled`) while the
 * panel — a descendant — toggles it.
 */
export const provideConnectionPanel = (): ConnectionPanelContext => {
	let isOpen = $state(false)

	const context: ConnectionPanelContext = {
		get isOpen() {
			return isOpen
		},
		set isOpen(value: boolean) {
			isOpen = value
		},
	}

	setContext(key, context)

	return context
}

export const useConnectionPanel = (): ConnectionPanelContext => {
	return getContext<ConnectionPanelContext>(key)
}
