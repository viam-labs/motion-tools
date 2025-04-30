import { serve } from 'bun'
import { getLocalIP } from './ip'

const localIP = getLocalIP()
const connections = new Set<Bun.ServerWebSocket<unknown>>()

const messages = {
	success: { message: 'Data received successfully', status: 200 },
	noClient: { message: 'No connected client', status: 404 },
}

function sendToClients(data: string | Bun.BufferSource) {
	if (connections.size === 0) {
		console.log('No connected clients to send:', data)
		return false
	}

	for (const ws of connections) {
		ws.send(data)
	}
	return true
}

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

function jsonResponse(data: any, status = 200) {
	return new Response(JSON.stringify(data), {
		status,
		headers: {
			'Content-Type': 'application/json',
			'Access-Control-Allow-Origin': '*',
		},
	})
}

serve({
	port: 3000,
	hostname: '0.0.0.0',

	fetch(req, server) {
		const { pathname } = new URL(req.url)

		if (pathname === '/ws') {
			if (server.upgrade(req)) return
			return new Response('Upgrade Failed', { status: 400 })
		}

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

		if (req.method === 'POST') {
			return handlePost(req, pathname)
		}

		return new Response('Not Found', { status: 404 })
	},

	websocket: {
		open(ws) {
			console.log('WebSocket client connected:', ws.remoteAddress)
			connections.add(ws)
		},
		message(ws, message) {
			console.log(`Received: ${message}`)
		},
		close(ws) {
			console.log('WebSocket client closed:', ws.remoteAddress)
			connections.delete(ws)
		},
	},
})

console.log(`Server running at http://${localIP}:3000`)
console.log(`WebSocket endpoint ws://${localIP}:3000/ws`)
