import express, { Response } from 'express'
import { WebSocketServer, type WebSocket } from 'ws'

const app = express()

let websocket: WebSocket | undefined

app.use(express.json({ limit: '100mb' }))
app.use(express.raw({ type: 'application/octet-stream', limit: '1000mb' }))

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

const sendToClient = (body: Parameters<WebSocket['send']>[0], res: Response) => {
	if (websocket) {
		websocket.send(body, (error) => {
			if (error) {
				res.json({
					status: 500,
					messages: `Websocket error: ${error.message}`,
				})
			}
			console.log(messages.success.status, messages.success.message)
			res.json(messages.success)
		})
	} else {
		console.log('No connected client to send:', body)
		res.json(messages.noClient)
	}
}

app.post('/shape', (req, res) => {
	sendToClient(JSON.stringify(req.body), res)
})

app.post('/pcd', (req, res) => {
	sendToClient(req.body, res)
})

app.listen(3000, () => {
	console.log(`Server running on http://localhost:${3000}`)
})

const wss = new WebSocketServer({ port: 3001 })

wss.on('connection', (ws) => {
	console.log(`WebSocket server running on ws://localhost:${3001}`)

	websocket = ws

	console.log('New client connected')

	ws.on('message', (message) => {
		console.log(`Received: ${message}`)
	})

	ws.on('close', () => {
		console.log('Client disconnected')
	})

	ws.on('error', (error) => {
		console.error(`WebSocket error: ${error}`)
	})
})
