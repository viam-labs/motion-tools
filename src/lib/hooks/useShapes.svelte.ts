import { getContext, setContext } from 'svelte'
import { Color, Vector3, Vector4, type Box3 } from 'three'
import { NURBSCurve } from 'three/addons/curves/NURBSCurve.js'
import { parsePcdInWorker } from '$lib/loaders/pcd'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { BatchedArrow } from '$lib/three/BatchedArrow'
import { WorldObject, type PointsGeometry } from '$lib/WorldObject'
import type { Geometry } from '@viamrobotics/sdk'

type ConnectionStatus = 'connecting' | 'open' | 'closed'

interface Context {
	points: WorldObject<PointsGeometry>[]
	meshes: WorldObject[]
	poses: WorldObject[]
	nurbs: WorldObject[]
	models: WorldObject[]

	connectionStatus: ConnectionStatus

	object3ds: {
		batchedArrow: BatchedArrow
	}
}

const key = Symbol('websocket-context-key')

const tryParse = (json: string) => {
	try {
		return JSON.parse(json)
	} catch (error) {
		console.warn('Failed to parse JSON:', error)
		return
	}
}

export const provideShapes = () => {
	let pointsIndex = 0
	let geometryIndex = 0
	let poseIndex = 0

	let reconnectDelay = 200

	const maxReconnectDelay = 5_000

	let ws: WebSocket

	const points = $state<WorldObject<PointsGeometry>[]>([])
	const meshes = $state<WorldObject[]>([])
	const poses = $state<WorldObject[]>([])
	const nurbs = $state<WorldObject[]>([])
	const models = $state<WorldObject[]>([])

	let connectionStatus = $state<ConnectionStatus>('connecting')

	const color = new Color()
	const direction = new Vector3()
	const origin = new Vector3()
	const vec3 = new Vector3()
	const loader = new GLTFLoader()

	const addPCD = async (data: Blob) => {
		const buffer = await data.arrayBuffer()
		const { positions, colors } = await parsePcdInWorker(new Uint8Array(buffer))

		points.push(
			new WorldObject(
				`points ${++pointsIndex}`,
				undefined,
				undefined,
				{
					case: 'points',
					value: positions,
				},
				colors ? { colors } : undefined
			)
		)
	}

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const addGeometry = (data: any, color: string, parent?: string) => {
		let geometry: Geometry['geometryType']

		if ('mesh' in data) {
			geometry = {
				case: 'mesh',
				value: { contentType: '', mesh: data.mesh.mesh },
			}
		} else if ('box' in data) {
			geometry = { case: 'box', value: data.box }
		} else if ('sphere' in data) {
			geometry = { case: 'sphere', value: data.sphere }
		} else if ('capsule' in data) {
			geometry = { case: 'capsule', value: data.capsule }
		} else {
			geometry = { case: undefined, value: undefined }
		}

		const object = new WorldObject(data.label ?? ++geometryIndex, data.center, parent, geometry, {
			color,
		})

		meshes.push(object)
	}

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const addNurbs = (data: any, color: string) => {
		const controlPoints = data.ControlPts.map(
			(point: Vector3) => new Vector4(point.x / 1000, point.y / 1000, point.z / 1000)
		)
		const curve = new NURBSCurve(data.Degree, data.Knots, controlPoints)
		const object = new WorldObject(
			data.name,
			data.pose,
			data.parent,
			{ case: 'line', value: new Float32Array() },
			{ color, points: curve.getPoints(200) }
		)

		nurbs.push(object)
	}

	const batchedArrow = new BatchedArrow()

	const addPoses = async (data: Blob) => {
		const buffer = await data.arrayBuffer()
		const array = new Float32Array(buffer)

		// metadata
		const [nPoses, nColors, arrowHeadAtPose] = array

		const posesStart = 3
		const pointEnd = posesStart + nPoses * 6
		const nextPoses = array.slice(posesStart, pointEnd)

		const colorStart = pointEnd
		const colorEnd = colorStart + nColors * 3
		const colors = array.slice(colorStart, colorEnd)

		const length = 0.1

		for (let i = 0, j = 0, l = nextPoses.length; i < l; i += 6, j += 3) {
			origin.set(nextPoses[i], nextPoses[i + 1], nextPoses[i + 2]).multiplyScalar(0.001)
			direction.set(nextPoses[i + 3], nextPoses[i + 4], nextPoses[i + 5])

			if (arrowHeadAtPose === 1) {
				// Compute the base position so the arrow ends at the origin
				origin.sub(vec3.copy(direction).multiplyScalar(length))
			}

			color.set(colors[j], colors[j + 1], colors[j + 2]).convertSRGBToLinear()

			const arrowId = batchedArrow.addArrow(direction, origin, length, color)
			poses.push(
				new WorldObject(`pose ${++poseIndex}`, undefined, undefined, undefined, {
					getBoundingBoxAt(box3: Box3) {
						return batchedArrow.getBoundingBoxAt(arrowId, box3)
					},
					batched: {
						id: arrowId,
						object: batchedArrow.object3d,
					},
				})
			)
		}
	}

	const addPoints = async (data: Blob) => {
		const buffer = await data.arrayBuffer()
		const array = new Float32Array(buffer)

		let i = 0

		const labelLen = array[i++]
		const label = String.fromCharCode(...array.slice(i, i + labelLen))
		i += labelLen

		const nPoints = array[i++]
		const nColors = array[i++]
		const [r, g, b] = array.slice(i, i + 3)
		i += 3

		const positions = array.slice(i, i + nPoints * 3)
		i += nPoints * 3

		const rawColors = array.slice(i, i + nColors * 3)

		const colors = new Float32Array(nPoints * 3)
		colors.set(rawColors)

		// Cover the gap for any points not colored
		for (let i = nColors; i < nPoints; i++) {
			const offset = i * 3
			colors[offset] = r
			colors[offset + 1] = g
			colors[offset + 2] = b
		}

		const color = new Color(r, g, b)

		points.push(
			new WorldObject(
				label ?? `points ${++pointsIndex}`,
				undefined,
				undefined,
				{
					case: 'points',
					value: positions,
				},
				colors ? { colors, color } : { color }
			)
		)
	}

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const addGeometries = (geometries: any[], colors: string[], parent: string) => {
		let i = 0
		for (const geometry of geometries) {
			addGeometry(geometry, colors[i], parent)
			i += 1
		}
	}

	const addGLTF = async (data: Blob) => {
		const buffer = await data.arrayBuffer()
		const blob = new Blob([buffer], { type: 'model/gltf-binary' })
		const url = URL.createObjectURL(blob)
		const gltf = await loader.loadAsync(url)
		models.push(new WorldObject(gltf.scene.name, undefined, undefined, undefined, { gltf }))
		URL.revokeObjectURL(url)
	}

	const remove = (names: string[]) => {
		let index = -1

		for (const name of names) {
			index = points.findIndex((p) => p.name === name)

			if (index !== -1) {
				points.splice(index, 1)
				continue
			}

			index = meshes.findIndex((m) => m.name === name)

			if (index !== -1) {
				meshes.splice(index, 1)
				continue
			}

			index = poses.findIndex((p) => p.name === name)

			if (index !== -1) {
				const id = poses[index].metadata.batched?.id

				if (id) {
					batchedArrow.removeArrow(id)
					poses.splice(index, 1)
					continue
				}
			}

			index = nurbs.findIndex((n) => n.name === name)

			if (index !== -1) {
				nurbs.splice(index, 1)
				continue
			}

			index = models.findIndex((m) => m.name === name)

			if (index !== -1) {
				models.splice(index, 1)
				continue
			}
		}
	}

	const removeAll = () => {
		points.splice(0, points.length)
		meshes.splice(0, meshes.length)

		nurbs.splice(0, nurbs.length)
		models.splice(0, models.length)

		poses.splice(0, poses.length)
		batchedArrow.clear()

		pointsIndex = 0
		geometryIndex = 0
		poseIndex = 0
	}

	let metadata: { type: string } | undefined = undefined

	const handleMetadata = (data: string) => {
		const json = tryParse(data)

		if ('type' in json) {
			metadata = json
			return true
		}

		return false
	}

	const { BACKEND_IP, BUN_SERVER_PORT } = globalThis as unknown as {
		BACKEND_IP?: string
		BUN_SERVER_PORT?: string
	}

	const scheduleReconnect = () => {
		setTimeout(() => {
			reconnectDelay = Math.min(reconnectDelay * 2, maxReconnectDelay)
			console.log(`Reconnecting in ${reconnectDelay / 1000} seconds...`)
			connect()
		}, reconnectDelay)
	}

	const onOpen = () => {
		connectionStatus = 'open'
		reconnectDelay = 1000
		console.log(`Connected to websocket server at ${BACKEND_IP}:${BUN_SERVER_PORT}`)
	}

	const onClose = () => {
		connectionStatus = 'closed'
		console.log('Disconnected from websocket server')
		scheduleReconnect()
	}

	const onError = (event: Event) => {
		console.log('Websocket error', JSON.stringify(event))
		ws.close()
	}

	const onMessage = (event: MessageEvent) => {
		if (typeof event.data === 'string') {
			if (handleMetadata(event.data)) {
				return
			}
		}

		if (typeof event.data === 'object' && 'arrayBuffer' in event.data) {
			if (!metadata) {
				return console.error('metadata is undefined')
			}

			if (metadata.type === 'glb') {
				return addGLTF(event.data)
			} else if (metadata.type === 'pcd') {
				return addPCD(event.data)
			} else if (metadata.type === 'points') {
				return addPoints(event.data)
			} else if (metadata.type === 'poses') {
				return addPoses(event.data)
			}
		}

		const data = tryParse(event.data)

		if (!data) return

		if ('geometries' in data) {
			return addGeometries(data.geometries, data.colors, data.parent)
		}

		if ('remove' in data) {
			return remove(data.names)
		}

		if ('removeAll' in data) {
			return removeAll()
		}

		if ('Knots' in data) {
			return addNurbs(data, data.Color)
		}

		if ('geometry' in data) {
			addGeometry(data.geometry, data.color)
		}
	}

	const connect = () => {
		if (BACKEND_IP && BUN_SERVER_PORT) {
			const protocol = location.protocol === 'https:' ? 'wss' : 'ws'
			ws = new WebSocket(`${protocol}://${BACKEND_IP}:${BUN_SERVER_PORT}/ws`)
			ws.onclose = onClose
			ws.onerror = onError
			ws.onopen = onOpen
			ws.onmessage = onMessage
		}
	}

	connect()

	setContext<Context>(key, {
		get points() {
			return points
		},
		get meshes() {
			return meshes
		},
		get poses() {
			return poses
		},
		get nurbs() {
			return nurbs
		},
		get models() {
			return models
		},
		get connectionStatus() {
			return connectionStatus
		},
		object3ds: {
			batchedArrow,
		},
	})
}

export const useShapes = () => {
	return getContext<Context>(key)
}
