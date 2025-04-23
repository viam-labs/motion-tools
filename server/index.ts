import express, { type Response } from 'express'
import { WebSocket, WebSocketServer } from 'ws'
import { getLocalIP } from './ip'

const app = express()

app.use(express.json({ limit: '10000mb' }))
app.use(express.raw({ type: 'model/gltf-binary', limit: '10000mb' }))
app.use(express.raw({ type: 'application/octet-stream', limit: '10000mb' }))

const localIP = getLocalIP()
const connections = new Set<WebSocket>()

const messages = {
	success: {
		message: 'Data received successfully',
		status: 200,
	},
	noClient: {
		message: 'No connected client',
		status: 404,
	},
}

const sendToClient = (body: Parameters<WebSocket['send']>[0], res?: Response) => {
	if (connections.size === 0) {
		console.log('No connected client to send:', body)
		res?.json(messages.noClient)
		return
	}

	let completed = 0

	const errors: Error[] = []

	for (const websocket of connections) {
		websocket.send(body, (error) => {
			if (error) {
				return errors.push(error)
			}

			completed += 1

			if (completed === connections.size) {
				if (errors.length > 0) {
					return res?.json({
						status: 500,
						messages: `Websocket error: ${errors.map((error) => error.message).join(',')}`,
					})
				}

				res?.json(messages.success)
			}
		})
	}
}

app.post('/geometry', (req, res) => {
	sendToClient(JSON.stringify(req.body), res)
})

app.post('/geometries', (req, res) => {
	sendToClient(JSON.stringify(req.body), res)
})

app.post('/poses', (req, res) => {
	sendToClient(JSON.stringify(req.body), res)
})

app.post('/nurbs', (req, res) => {
	sendToClient(JSON.stringify(req.body), res)
})

app.post('/pcd', (req, res) => {
	console.log(Date.now())
	sendToClient(JSON.stringify({ ext: 'pcd' }))
	sendToClient(req.body, res)
})

app.post('/gltf', (req, res) => {
	sendToClient(JSON.stringify({ ext: 'glb' }))
	sendToClient(req.body, res)
})

app.post('/remove-all', (_req, res) => {
	sendToClient(JSON.stringify({ removeAll: true }), res)
})

app.listen(3000, () => {
	console.log(`Server running on http://${localIP}:${3000}`)
})

const socketServer = new WebSocketServer({ port: 3001, host: localIP })

socketServer.on('connection', (ws, request) => {
	console.log(`WebSocket server running on ws://${localIP}:${3001}`)

	connections.add(ws)

	console.log('New client connected:', request.socket.remoteAddress)

	ws.on('message', (message) => {
		console.log(`Received: ${message}`)
	})

	ws.on('close', () => {
		console.log('Client disconnected')
		connections.delete(ws)
	})

	ws.on('error', (error) => {
		console.error(`WebSocket error: ${error}`)
	})
})
