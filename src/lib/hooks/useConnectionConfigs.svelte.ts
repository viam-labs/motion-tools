import { get, set } from 'idb-keyval'
import { PersistedState } from 'runed'
import { getContext, setContext } from 'svelte'
import { envDialConfigs } from '../../routes/lib/configs'

interface ConnectionConfig {
	host: string
	partId: string
	apiKeyId: string
	apiKeyValue: string
	signalingAddress: string
}

const key = Symbol('connection-config-context')
const activeConfig = new PersistedState<number>('active-connection-config', 0)

interface Context {
	current: ConnectionConfig[]
}

export const provideConnectionConfigs = () => {
	let connectionConfigs: ConnectionConfig[] = $state([])

	get('connection-configs').then((response) => {
		if (Array.isArray(response)) {
			connectionConfigs = response
		}
	})

	$effect(() => {
		set('connection-configs', $state.snapshot(connectionConfigs))
	})

	const envConfigs = Object.values(envDialConfigs)

	setContext<Context>(key, {
		get current() {
			return [...envConfigs, ...connectionConfigs]
		},
	})
}

export const useConnectionConfigs = () => {
	return getContext<Context>(key)
}

export const useActiveConnectionConfig = () => {
	const connectionConfigs = useConnectionConfigs()

	return {
		get current() {
			if (activeConfig.current === -1) {
				return undefined
			}
			return connectionConfigs.current.at(activeConfig.current)
		},
		set(index: number | undefined) {
			activeConfig.current = index ?? -1
		},
	}
}
