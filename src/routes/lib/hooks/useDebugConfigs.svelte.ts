import { get, set } from 'idb-keyval'
import { PersistedState } from 'runed'
import { getContext, setContext } from 'svelte'

export interface DebugConfig {
	name: string
	partId: string
	apiKeyId: string
	apiKeyValue: string
}

const key = Symbol('debug-config-context')
const activeDebugConfig = new PersistedState<number>('active-debug-config', -1)

interface Context {
	current: DebugConfig[]
	add: (config?: DebugConfig) => void
	remove: (index: number) => void
}

export const provideDebugConfigs = () => {
	let debugConfigs: DebugConfig[] = $state([])
	let loaded = $state(false)

	get('debug-configs').then((response) => {
		if (Array.isArray(response)) {
			debugConfigs = response.filter((config) => config !== undefined)
		}
		loaded = true
	})

	$effect(() => {
		if (!loaded) return
		set('debug-configs', $state.snapshot(debugConfigs))
	})

	const add = (config?: DebugConfig) => {
		debugConfigs.push(
			config ?? {
				name: '',
				partId: '',
				apiKeyId: '',
				apiKeyValue: '',
			}
		)
	}

	const remove = (index: number) => {
		debugConfigs.splice(index, 1)
		if (activeDebugConfig.current === index) {
			activeDebugConfig.current = -1
		} else if (activeDebugConfig.current > index) {
			activeDebugConfig.current -= 1
		}
	}

	setContext<Context>(key, {
		get current() {
			return debugConfigs
		},
		add,
		remove,
	})
}

export const useDebugConfigs = () => {
	return getContext<Context>(key)
}

export const useActiveDebugConfig = () => {
	const debugConfigs = useDebugConfigs()

	return {
		get current(): DebugConfig | undefined {
			if (activeDebugConfig.current < 0) return undefined
			return debugConfigs.current.at(activeDebugConfig.current)
		},
		get activeIndex(): number {
			return activeDebugConfig.current
		},
		set(index: number | undefined) {
			activeDebugConfig.current = index ?? -1
		},
	}
}
