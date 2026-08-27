import { PersistedState } from 'runed'
import { getContext, setContext } from 'svelte'

const key = Symbol('world-tree-expanded-folders')

interface Context {
	/** `collapsedByDefault` answers for a folder the user has never toggled. */
	isExpanded(name: string, collapsedByDefault: boolean): boolean
	setExpanded(name: string, expanded: boolean): void
}

/**
 * Which world-tree folders the user left open. Keyed by folder name because entity
 * ids are handed out fresh each session, so nothing else survives a reload.
 */
export const provideExpandedFolders = (): void => {
	const stored = new PersistedState<Record<string, boolean>>('world-tree-expanded-folders', {})

	setContext<Context>(key, {
		isExpanded(name, collapsedByDefault) {
			return stored.current[name] ?? !collapsedByDefault
		},
		setExpanded(name, expanded) {
			stored.current[name] = expanded
		},
	})
}

export const useExpandedFolders = (): Context => {
	return getContext<Context>(key)
}
