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
	/**
	 * Whether the scene follows live machine data. True in every mode but `build`,
	 * where the part config is the source of truth and the pose / geometry /
	 * pointcloud polls are paused.
	 */
	readonly isLive: boolean
}

const defaults = (): Environment => ({
	mode: 'monitor',
	isStandalone: true,
	inputBindingsEnabled: true,
})

export const createEnvironment = (): Context => {
	const environment = $state<Environment>(defaults())

	const context: Context = {
		get current() {
			return environment
		},
		get isLive() {
			return environment.mode !== 'build'
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
