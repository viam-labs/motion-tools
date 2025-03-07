import { getContext, setContext } from 'svelte'

interface Context {
	current: any[]
}

const key = Symbol('websocket-context-key')

export const provideWebsocket = () => {
	const ws = new WebSocket('ws://localhost:3001')

	ws.onopen = () => {
		console.log('Connected to server')
		ws.send('Hello, Server!')
	}

	ws.onmessage = (event) => {
		current.push(JSON.parse(event.data))
	}

	ws.onclose = () => {
		console.log('Disconnected from server')
	}

	let current = $state<any[]>([])

	setContext<Context>(key, {
		get current() {
			return current
		},
	})
}

export const useWebsocketClient = () => {
	return getContext<Context>(key)
}
