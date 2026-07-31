import { PersistedState } from 'runed'
import { getContext, setContext } from 'svelte'

export const ENVIRONMENT_CONTEXT_KEY = Symbol('environment')

/**
 * What the app is being used for right now. Each mode owns its own details panel
 * and its own scene affordances:
 *
 *  - `monitor` — read live machine data.
 *  - `build` — author the scene from the part config; live polling is paused so
 *    staged edits aren't overwritten.
 *  - `move` — drive a frame to a goal pose through the motion service. Contributed
 *    by the `MoveFrame` plugin; unreachable when it isn't mounted.
 */
export type EnvironmentMode = 'monitor' | 'build' | 'move'

interface Environment {
	mode: EnvironmentMode
	isStandalone: boolean
	inputBindingsEnabled: boolean
}

interface Context {
	current: Environment
	readonly buildSyncing: boolean
	/**
	 * Whether the scene follows live machine data. True in every mode but `build`,
	 * where the part config is the source of truth and the pose / geometry /
	 * pointcloud polls are paused.
	 */
	readonly isLive: boolean
	finishBuildSync: () => void
}

/** Where the persisted mode lives. Exported so tests can reset it. */
export const ENVIRONMENT_MODE_STORAGE_KEY = 'motion-tools:environment-mode'

const modes = new Set<EnvironmentMode>(['monitor', 'build', 'move'])

export const createEnvironment = (): Context => {
	// The mode is the user's choice of tool, so it outlives the session. The rest
	// describes the host and is set on mount.
	const stored = new PersistedState<EnvironmentMode>(ENVIRONMENT_MODE_STORAGE_KEY, 'monitor')
	let buildSyncing = $state(stored.current === 'build')

	const environment = $state<Environment>({
		get mode() {
			return modes.has(stored.current) ? stored.current : 'monitor'
		},
		set mode(value: EnvironmentMode) {
			if (value === 'build' && stored.current !== 'build') buildSyncing = true
			if (value !== 'build') buildSyncing = false
			stored.current = value
		},
		isStandalone: true,
		inputBindingsEnabled: true,
	})

	const context: Context = {
		get current() {
			return environment
		},
		get isLive() {
			return environment.mode !== 'build' || buildSyncing
		},
		get buildSyncing() {
			return buildSyncing
		},
		finishBuildSync() {
			buildSyncing = false
		},
	}

	return context
}

export const provideEnvironment = () => {
	const context = createEnvironment()
	setContext<Context>(ENVIRONMENT_CONTEXT_KEY, context)
	return context
}

export const useEnvironment = () => {
	return getContext<Context>(ENVIRONMENT_CONTEXT_KEY)
}
