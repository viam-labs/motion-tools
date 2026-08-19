import { PersistedState } from 'runed'
import { getContext, onDestroy, setContext } from 'svelte'
import { SvelteMap } from 'svelte/reactivity'

export const ENVIRONMENT_CONTEXT_KEY = Symbol('environment')

/**
 * What the app is being used for right now. Each mode owns its own details panel
 * and its own scene affordances:
 *
 *  - `monitor` — read live machine data.
 *  - `build` — author the scene from the part config; live polling is paused so
 *    staged edits aren't overwritten. Contributed by the `BuildFrames` plugin.
 *  - `move` — drive a frame to a goal pose through the motion service. Contributed
 *    by the `MoveFrame` plugin; unreachable when it isn't mounted.
 */
export type EnvironmentMode = 'monitor' | 'build' | 'move'

interface Environment {
	mode: EnvironmentMode
	isStandalone: boolean
	inputBindingsEnabled: boolean
	/**
	 * Whether an immersive XR session owns the canvas. Published by the XR plugin
	 * so readers don't need `@threlte/xr`, which is an optional peer.
	 */
	isImmersive: boolean
}

interface Context {
	current: Environment
	/** Whether live scene queries may run. Normally follows mode, but remains true
	 * temporarily while build mode captures its initial machine snapshot. */
	readonly isLive: boolean
	/** Updates the live-query gate; used by build-mode synchronization to open and
	 * close its temporary snapshot window. */
	setLive: (value: boolean) => void
	/**
	 * Declares `mode` reachable for as long as the caller is mounted, and returns
	 * the matching release function.
	 */
	registerMode: (mode: EnvironmentMode) => () => void
	/** Every mode currently reachable, in declaration order. Always includes `monitor`. */
	readonly availableModes: EnvironmentMode[]
}

/** Where the persisted mode lives. Exported so tests can reset it. */
export const ENVIRONMENT_MODE_STORAGE_KEY = 'motion-tools:environment-mode'

const modes = new Set<EnvironmentMode>(['monitor', 'build', 'move'])

export const createEnvironment = (): Context => {
	const stored = new PersistedState<EnvironmentMode>(ENVIRONMENT_MODE_STORAGE_KEY, 'monitor')
	const availableModes = new SvelteMap<EnvironmentMode, number>([['monitor', 1]])

	const effectiveMode = $derived.by((): EnvironmentMode => {
		const value = stored.current
		return modes.has(value) && availableModes.has(value) ? value : 'monitor'
	})

	let isLive = $state(effectiveMode !== 'build')

	const environment = $state<Environment>({
		get mode() {
			return effectiveMode
		},
		set mode(value: EnvironmentMode) {
			stored.current = value
			isLive = effectiveMode !== 'build'
		},
		isStandalone: true,
		inputBindingsEnabled: true,
		isImmersive: false,
	})

	const context: Context = {
		get current() {
			return environment
		},
		get isLive() {
			return isLive
		},
		get availableModes() {
			return [...modes].filter((mode) => availableModes.has(mode))
		},
		setLive(value) {
			isLive = value
		},
		registerMode(mode) {
			availableModes.set(mode, (availableModes.get(mode) ?? 0) + 1)

			let released = false
			return () => {
				if (released) return
				released = true

				const count = (availableModes.get(mode) ?? 1) - 1
				if (count > 0) {
					availableModes.set(mode, count)
				} else {
					availableModes.delete(mode)
				}
			}
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

/**
 * Declares `mode` reachable for as long as the calling component is mounted.
 * Plugins that contribute a mode call this in setup (synchronously), so the first
 * render already resolves the persisted mode instead of flashing `monitor`.
 */
export const useEnvironmentMode = (mode: EnvironmentMode) => {
	const release = useEnvironment().registerMode(mode)
	onDestroy(release)
}
