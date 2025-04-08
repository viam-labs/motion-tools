import express, { type Request, type Response, type NextFunction } from 'express'
import { WebSocket, WebSocketServer } from 'ws'
import { z } from 'zod'
import { geometrySchema } from './schema'
import os from 'node:os'

const app = express()

app.use(express.json({ limit: '100mb' }))
app.use(express.raw({ type: 'application/octet-stream', limit: '1000mb' }))

/** Get the local IP (non-internal IPv4 address) */
const getLocalIP = () => {
	const interfaces = os.networkInterfaces()

	for (const ifaceList of Object.values(interfaces)) {
		for (const iface of ifaceList ?? []) {
			if (iface.family === 'IPv4' && !iface.internal) {
				return iface.address
			}
		}
	}

	return 'localhost'
}

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

// Middleware for validation
const validate = (schema: z.ZodSchema) => (req: Request, res: Response, next: NextFunction) => {
	const result = schema.safeParse(req.body)
	if (!result.success) {
		return res.status(400).json({ errors: result.error.format() })
	}
	req.body = result.data // Ensures type safety in controllers
	next()
}

const sendToClient = (body: Parameters<WebSocket['send']>[0], res: Response) => {
	if (connections.size === 0) {
		console.log('No connected client to send:', body)
		res.json(messages.noClient)
		return
	}

	for (const websocket of connections) {
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
	}
}

app.post('/geometry', validate(geometrySchema), (req, res) => {
	sendToClient(JSON.stringify(req.body), res)
})

app.post('/poses', (req, res) => {
	sendToClient(JSON.stringify(req.body), res)
})

app.post('/nurbs', (req, res) => {
	sendToClient(JSON.stringify(req.body), res)
})

app.post('/pcd', (req, res) => {
	sendToClient(req.body, res)
})

app.post('/remove-all', (_req, res) => {
	sendToClient(JSON.stringify({ removeAll: true }), res)
})

app.listen(3000, () => {
	console.log(`Server running on http://${localIP}:${3000}`)
})

const wss = new WebSocketServer({ port: 3001, host: localIP })

wss.on('connection', (ws) => {
	console.log(`WebSocket server running on ws://${localIP}:${3001}`)

	connections.add(ws)

	console.log('New client connected: ', ws.url)

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
