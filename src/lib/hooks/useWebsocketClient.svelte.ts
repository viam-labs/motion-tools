import { getContext, setContext } from 'svelte'
import { Geometry, Pose } from '@viamrobotics/sdk'
import type { Frame } from './useFrames.svelte'
import { PCDLoader } from 'three/addons/loaders/PCDLoader.js'
import { PLYLoader } from 'three/addons/loaders/PLYLoader.js'
import { DoubleSide, Mesh, MeshToonMaterial, type Points } from 'three'
import { createGeometry, createPose } from '$lib/transform'
import { parsePCD } from '$lib/loaders/pcd'

interface Context {
	current: {
		name: string
		parent: string
		geometry: Geometry
		pose: Pose
	}[]
	points: Points[]
	meshes: Mesh[]
}

const key = Symbol('websocket-context-key')

const pcdLoader = new PCDLoader()
const plyLoader = new PLYLoader()

const tryParse = (json: string) => {
	try {
		return JSON.parse(json)
	} catch {
		return
	}
}

let index = 0

export const provideWebsocket = () => {
	const ws = new WebSocket('ws://localhost:3001')
	const current = $state<Frame[]>([])
	const points = $state<Points[]>([])
	const meshes = $state<Mesh[]>([])

	ws.onopen = () => {
		console.log('Connected to server')
	}

	const addPcd = (data: any) => {
		return (data as Blob).arrayBuffer().then((buffer) => {
			const result = pcdLoader.parse(buffer)
			result.name = `points ${++index}`
			points.push(result)
		})
	}

	const addMesh = (data: any) => {
		if (data.mesh.contentType === 'ply') {
			const geometry = plyLoader.parse(atob(data.mesh.mesh))
			const material = new MeshToonMaterial({
				color: 'purple',
				side: DoubleSide,
				transparent: true,
				opacity: 0.7,
			})
			const mesh = new Mesh(geometry, material)
			mesh.name = data.label
			meshes.push(mesh)
		}
	}

	const addShape = (data: any) => {
		if (data.mesh) {
			return addMesh(data)
		}

		const geometry = createGeometry(
			data.box
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
			data.label
		)

		const object = {
			name: data.label ?? crypto.randomUUID(),
			parent: 'world',
			geometry,
			pose: createPose(data.center),
		}

		current.push(object)
	}

	ws.onmessage = (event) => {
		if (typeof event.data === 'object' && 'arrayBuffer' in event.data) {
			addPcd(event.data)
		}

		const data = tryParse(event.data)

		if (!data) return

		addShape(data)
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
		get meshes() {
			return meshes
		},
	})
}

export const useShapes = () => {
	return getContext<Context>(key)
}
