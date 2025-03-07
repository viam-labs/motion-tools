import { getContext, setContext } from 'svelte'
import { Geometry, Pose, RectangularPrism } from '@viamrobotics/sdk'

interface Context {
	current: {
		name: string
		parent: 'world'
		geometry: Geometry
		pose: Pose
	}[]
}

const key = Symbol('websocket-context-key')

export const provideWebsocket = () => {
	const ws = new WebSocket('ws://localhost:3001')

	ws.onopen = () => {
		console.log('Connected to server')
		ws.send('Hello, Server!')
	}

	ws.onmessage = (event) => {
		const data = JSON.parse(event.data)
		console.log(data.center)

		const geometry = {
			geometryType: data.box
				? {
						case: 'box',
						value: { ...data.box },
					}
				: data.sphere
					? {
							case: 'sphere',
							value: { ...data.sphere },
						}
					: {
							case: 'capsule',
							value: { ...data.capsule },
						},
			label: data.label,
		} satisfies Geometry

		const pose = {
			x: data.center.x ?? 0,
			y: data.center.y ?? 0,
			z: data.center.z ?? 0,
			oX: data.center.oX ?? 0,
			oY: data.center.oY ?? 0,
			oZ: data.center.oZ ?? 0,
			theta: data.center.theta ?? 0,
		} satisfies Pose

		console.log(data.center)

		const object = {
			name: data.label ?? crypto.randomUUID(),
			parent: 'world',
			geometry,
			pose,
		}

		current.push(object)
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
