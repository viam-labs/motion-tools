import { serve } from 'bun'
import { getLocalIP } from './ip'

const localIP = getLocalIP()
const connections = new Set<WebSocket>()
const HEARTBEAT_INTERVAL = 30_000 // 30 seconds

const messages = {
	success: { message: 'Data received successfully', status: 200 },
	noClient: { message: 'No connected client', status: 404 },
}

// Broadcasts to all live clients
function sendToClients(data: Parameters<WebSocket['send']>[0]) {
	if (connections.size === 0) {
		console.log('No connected clients to send:', data)
		return false
	}
	console.log(connections.size, data)
	for (const ws of connections) {
		if (ws.readyState === ws.OPEN) {
			ws.send(data)
		}
	}
	return true
}

// Handle incoming POST requests
async function handlePost(req: Request, pathname: string): Promise<Response> {
	try {
		switch (pathname) {
			case '/geometry':
			case '/geometries':
			case '/poses':
			case '/nurbs': {
				const json = await req.json()
				sendToClients(JSON.stringify(json))
				return jsonResponse(messages.success, 200)
			}

			case '/pcd': {
				const buffer = await req.arrayBuffer()
				sendToClients(JSON.stringify({ ext: 'pcd' }))
				sendToClients(buffer)
				return jsonResponse(messages.success, 200)
			}

			case '/gltf': {
				const buffer = await req.arrayBuffer()
				sendToClients(JSON.stringify({ ext: 'glb' }))
				sendToClients(buffer)
				return jsonResponse(messages.success, 200)
			}

			case '/remove-all': {
				sendToClients(JSON.stringify({ removeAll: true }))
				return jsonResponse(messages.success, 200)
			}

			default:
				return new Response('Not Found', { status: 404 })
		}
	} catch (err) {
		console.error('Error handling POST:', err)
		return new Response('Server Error', { status: 500 })
	}
}

// Create a JSON response with CORS
function jsonResponse(data: any, status = 200) {
	return new Response(JSON.stringify(data), {
		status,
		headers: {
			'Content-Type': 'application/json',
			'Access-Control-Allow-Origin': '*', // CORS: allow all
		},
	})
}

serve({
	port: 3000,
	hostname: '0.0.0.0',

	async fetch(req, server) {
		const { pathname } = new URL(req.url)

		// Handle WebSocket Upgrade
		if (pathname === '/ws') {
			if (server.upgrade(req)) return
			return new Response('Upgrade Failed', { status: 400 })
		}

		// Handle CORS preflight
		if (req.method === 'OPTIONS') {
			return new Response(null, {
				status: 204,
				headers: {
					'Access-Control-Allow-Origin': '*',
					'Access-Control-Allow-Methods': 'POST, OPTIONS',
					'Access-Control-Allow-Headers': 'Content-Type',
				},
			})
		}

		// Handle POST endpoints
		if (req.method === 'POST') {
			return handlePost(req, pathname)
		}

		// Default fallback
		return new Response('Not Found', { status: 404 })
	},

	websocket: {
		open(ws) {
			console.log('WebSocket connected')
			connections.add(ws)
			ws.data = { isAlive: true }
		},
		message(ws, message) {
			console.log(`Received: ${message}`)
		},
		close(ws) {
			console.log('WebSocket closed')
			connections.delete(ws)
		},
		ping(ws) {
			// Mark the connection as alive
			ws.data.isAlive = true
		},
	},
})

console.log(`Server running at http://${localIP}:3000`)
console.log(`WebSocket endpoint ws://${localIP}:3000/ws`)

// Heartbeat ping loop
setInterval(() => {
	for (const ws of connections) {
		if (!ws.data?.isAlive) {
			console.log('Terminating dead WebSocket')
			ws.close()
			connections.delete(ws)
			continue
		}
		ws.data.isAlive = false
		ws.ping()
	}
}, HEARTBEAT_INTERVAL)
