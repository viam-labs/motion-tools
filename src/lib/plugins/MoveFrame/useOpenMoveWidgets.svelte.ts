import { PersistedState } from 'runed'

export interface OpenMoveWidgets {
	/** Frames with an open move panel for the current part. */
	readonly current: string[]
	/** Open a move panel for a frame (no-op if already open). */
	open: (frameName: string) => void
	/** Close a frame's move panel (no-op if not open). */
	close: (frameName: string) => void
}

/**
 * The frames with an open move panel, persisted per part to localStorage so panels
 * survive a reload. Self-contained to the MoveFrame plugin — it owns this state rather
 * than the app-wide settings store, so the plugin can be mounted (or not) in isolation.
 */
export const useOpenMoveWidgets = (partID: () => string): OpenMoveWidgets => {
	const store = $derived(
		new PersistedState<string[]>(`motion-tools:open-move-widgets:${partID()}`, [])
	)

	return {
		get current() {
			return store.current
		},
		open: (frameName) => {
			if (store.current.includes(frameName)) return
			store.current = [...store.current, frameName]
		},
		close: (frameName) => {
			if (!store.current.includes(frameName)) return
			store.current = store.current.filter((name) => name !== frameName)
		},
	}
}
