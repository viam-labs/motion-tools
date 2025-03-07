export const provideWebsocket = () => {
	const ws = new WebSocket('ws://localhost:8080')

	ws.onopen = () => {
		console.log('Connected to server')
		ws.send('Hello, Server!')
	}

	ws.onmessage = (event) => {
		console.log(`Received from server: ${event.data}`)
	}

	ws.onclose = () => {
		console.log('Disconnected from server')
	}
}
