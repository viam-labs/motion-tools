import { getContext, setContext } from 'svelte'

export const DEFAULT_DRAW_SERVICE_PORT = '3030'

export interface DrawConnectionConfig {
	backendIP: string
	websocketPort: string

	/** Connect-RPC port for the draw service. Defaults to `DEFAULT_DRAW_SERVICE_PORT`. */
	drawServicePort?: string
}

interface Context {
	current: DrawConnectionConfig | undefined
}

const key = Symbol('draw-connection-config-key')

export const provideDrawConnectionConfig = (args: () => DrawConnectionConfig | undefined) => {
	const current = $derived(args())

	setContext<Context>(key, {
		get current() {
			return current
		},
	})
}

export const useDrawConnectionConfig = (): Context => {
	return getContext<Context>(key)
}
