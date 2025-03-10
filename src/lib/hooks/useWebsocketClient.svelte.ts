import { getContext, setContext } from 'svelte'
import { Geometry, Pose } from '@viamrobotics/sdk'
import type { Frame } from './useFrames.svelte'
import { PCDLoader } from 'three/addons/loaders/PCDLoader.js'
import type { Points } from 'three'

interface Context {
	current: {
		name: string
		parent: string
		geometry: Geometry
		pose: Pose
	}[]
	points: Points[]
}

const key = Symbol('websocket-context-key')

const tryParse = (json: string) => {
	try {
		return JSON.parse(json)
	} catch {
		return
	}
}

export const provideWebsocket = () => {
	const ws = new WebSocket('ws://localhost:3001')
	const loader = new PCDLoader()

	let current = $state<Frame[]>([])
	let points = $state<Points[]>([])

	ws.onopen = () => {
		console.log('Connected to server')
		ws.send('Hello, Server!')
	}

	ws.onmessage = (event) => {
		const data = tryParse(event.data)

		if (data) {
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
				x: data.center?.x ?? 0,
				y: data.center?.y ?? 0,
				z: data.center?.z ?? 0,
				oX: data.center?.oX ?? 0,
				oY: data.center?.oY ?? 0,
				oZ: data.center?.oZ ?? 0,
				theta: data.center?.theta ?? 0,
			} satisfies Pose

			const object = {
				name: data.label ?? crypto.randomUUID(),
				parent: 'world',
				geometry,
				pose,
			}

			current.push(object)
		} else if ('arrayBuffer' in event.data) {
			const blob = event.data as Blob
			blob.arrayBuffer().then((buffer) => {
				const result = loader.parse(buffer)
				points.push(result)
			})
		}
	}

	ws.onclose = () => {
		console.log('Disconnected from server')
	}

	setContext<Context>(key, {
		get current() {
			return current
		},
		get points() {
			return points
		},
	})
}

export const useWebsocketClient = () => {
	return getContext<Context>(key)
}
