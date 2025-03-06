import { get, set } from 'idb-keyval'
import { PersistedState } from 'runed'

interface ConnectionConfig {
	host: string
	partId: string
	apiKeyId: string
	apiKeyValue: string
	signalingAddress: string
}

let connectionConfigs: ConnectionConfig[] = $state([])
let activeConfig = new PersistedState('active-connection-config', 0)

export const provideConnectionConfigs = () => {
	get('connection-configs').then((response) => {
		connectionConfigs = response ?? []
	})

	$effect(() => {
		set('connection-configs', $state.snapshot(connectionConfigs))
	})
}

export const useConnectionConfigs = () => {
	return {
		get current() {
			return connectionConfigs
		},
	}
}

export const useActiveConnectionConfig = () => {
	return {
		get current() {
			return connectionConfigs.at(activeConfig.current)
		},
		set(index: number) {
			activeConfig.current = index
		},
	}
}
