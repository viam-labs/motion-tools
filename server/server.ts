import { serve, spawn } from 'bun'
import { getLocalIP } from './ip'

const localIP = getLocalIP()
const connections = new Set<Bun.ServerWebSocket<unknown>>()

const messages = {
	success: { message: 'Data received successfully', status: 200 },
	noClient: { message: 'No connected client', status: 404 },
}

const launchVite = async (port: number) => {
	spawn({
		cmd: ['bun', 'run', 'vite'],
		env: {
			...process.env,
			BUN_SERVER_PORT: port.toString(),
		},
		stdout: 'inherit',
		stderr: 'inherit',
	})
}

function sendToClients(data: string | Bun.BufferSource) {
	if (connections.size === 0) {
		console.log('No connected web clients to send data!')
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

			case '/points': {
				const buffer = await req.arrayBuffer()
				sendToClients(JSON.stringify({ ext: 'points' }))
				sendToClients(buffer)
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

			case '/remove': {
				const json = await req.json()
				sendToClients(JSON.stringify({ remove: true, names: json }))
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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function jsonResponse(data: any, status = 200) {
	return new Response(JSON.stringify(data), {
		status,
		headers: {
			'Content-Type': 'application/json',
			'Access-Control-Allow-Origin': '*',
		},
	})
}

let port = 3000

while (true) {
	try {
		serve({
			port,
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
					console.log('WebSocket client connected at:', ws.remoteAddress)
					connections.add(ws)
				},
				message(ws, message) {
					console.log(`Received: ${message}`)
				},
				close(ws) {
					console.log('WebSocket client closed at:', ws.remoteAddress)
					connections.delete(ws)
				},
			},
		})
		console.log(`Server running at http://${localIP}:${port}`)
		console.log(`WebSocket endpoint ws://${localIP}:${port}/ws`)

		launchVite(port)

		break
	} catch (error) {
		if (error.code === 'EADDRINUSE') {
			console.warn(`Port ${port} in use, trying ${port + 1}...`)
			port += 1
		} else {
			console.error('Failed to start server:', error)
			break
		}
	}
}
