import { get, set } from 'idb-keyval'
import { isEqual } from 'lodash-es'
import { PersistedState } from 'runed'
import { getContext, setContext } from 'svelte'

import type { ConnectionConfig } from './config'

const key = Symbol('connection-config-context')
const activeConfig = new PersistedState<number>('active-connection-config', 0)

interface Context {
	current: ConnectionConfig[]
	add: (config?: ConnectionConfig) => void
	remove: (index: number) => void
	isEnvConfig: (config: ConnectionConfig) => boolean
}

/**
 * @param getInitialConfigs Read-only seed configs supplied by the host app (e.g. from
 * its build env). They are pinned to the front of the merged list and cannot be deleted.
 * User-created configs are appended and persisted to IndexedDB.
 */
export const provideConnectionConfigs = (
	getInitialConfigs: () => ConnectionConfig[] = () => []
) => {
	let connectionConfigs: ConnectionConfig[] = $state([])

	get('connection-configs').then((response) => {
		if (Array.isArray(response)) {
			connectionConfigs = response.filter((config) => config !== undefined)
		}
	})

	$effect(() => {
		set('connection-configs', $state.snapshot(connectionConfigs))
	})

	const initialConfigs = $derived(getInitialConfigs())

	const add = (config?: ConnectionConfig) => {
		connectionConfigs.push(
			config ?? {
				host: '',
				partId: '',
				apiKeyId: '',
				apiKeyValue: '',
				signalingAddress: '',
			}
		)
	}

	const remove = (index: number) => {
		connectionConfigs.splice(index - initialConfigs.length, 1)
	}

	const isEnvConfig = (config: ConnectionConfig) => {
		return initialConfigs.some((value) => isEqual(config, value))
	}

	const mergedConfigs = $derived([...initialConfigs, ...connectionConfigs])

	setContext<Context>(key, {
		get current() {
			return mergedConfigs
		},
		add,
		remove,
		isEnvConfig,
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
