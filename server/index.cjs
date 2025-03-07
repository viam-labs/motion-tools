const express = require('express')

const app = express()

app.use(express.json())

app.post('/shape', (req, res) => {
	console.log('Received POST request:', req.body)

	res.json({ message: 'Data received successfully', receivedData: req.body })
})

app.listen(3000, () => {
	console.log(`Server running on http://localhost:${3000}`)
})

const WebSocket = require('ws')
const wss = new WebSocket.Server({ port: 3001 })

console.log(`WebSocket server running on ws://localhost:${3001}`)

wss.on('connection', (ws) => {
	console.log('New client connected')

	ws.on('message', (message) => {
		console.log(`Received: ${message}`)

		// Echo the message back to the client
		ws.send(`Server received: ${message}`)
	})

	ws.on('close', () => {
		console.log('Client disconnected')
	})

	ws.on('error', (error) => {
		console.error(`WebSocket error: ${error}`)
	})
})
