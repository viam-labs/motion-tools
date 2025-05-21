import { getContext, setContext } from 'svelte'
import { Vector3, Vector4, type Box3 } from 'three'
import { NURBSCurve } from 'three/addons/curves/NURBSCurve.js'
import { parsePCD } from '$lib/loaders/pcd'
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

	const { BACKEND_IP, BUN_SERVER_PORT } = globalThis as unknown as {
		BACKEND_IP: string
		BUN_SERVER_PORT: string
	}

	let ws: WebSocket

	const points = $state<WorldObject<PointsGeometry>[]>([])
	const meshes = $state<WorldObject[]>([])
	const poses = $state<WorldObject[]>([])
	const nurbs = $state<WorldObject[]>([])
	const models = $state<WorldObject[]>([])

	let connectionStatus = $state<ConnectionStatus>('connecting')

	const loader = new GLTFLoader()

	const addPcd = async (data: object) => {
		const buffer = await (data as Blob).arrayBuffer()
		const { positions, colors } = await parsePCD(new Uint8Array(buffer))

		points.push(
			new WorldObject(
				`points ${++pointsIndex}`,
				undefined,
				undefined,
				{
					case: 'points',
					value: new Float32Array(positions),
				},
				colors ? { colors: new Float32Array(colors) } : undefined
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

	const direction = new Vector3()
	const origin = new Vector3()
	const vec3 = new Vector3()
	const batchedArrow = new BatchedArrow()

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const addPoses = (nextPoses: any[], colors: string[], arrowHeadAtPose: boolean) => {
		for (let i = 0, l = nextPoses.length; i < l; i += 1) {
			const pose = nextPoses[i]
			const length = 0.1

			direction.set(pose.oX ?? 0, pose.oY ?? 0, pose.oZ ?? 0)
			origin.set((pose.x ?? 0) / 1000, (pose.y ?? 0) / 1000, (pose.z ?? 0) / 1000)

			if (arrowHeadAtPose) {
				// Compute the base position so the arrow ends at the origin
				origin.sub(vec3.copy(direction).multiplyScalar(length))
			}

			const arrowId = batchedArrow.addArrow(direction, origin, length, colors[i])
			poses.push(
				new WorldObject(`pose ${++poseIndex}`, pose, undefined, undefined, {
					getBoundingBoxAt(box3: Box3) {
						return batchedArrow.getBoundingBoxAt(arrowId, box3)
					},
					batched: {
						id: arrowId,
						name: batchedArrow.object3d.name,
					},
				})
			)
		}
	}

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const addGeometries = (geometries: any[], colors: string[], parent: string) => {
		let i = 0
		for (const geometry of geometries) {
			addGeometry(geometry, colors[i], parent)
			i += 1
		}
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

	let metadata: { ext: string } | undefined = undefined

	const handleMetadata = (data: string) => {
		const json = tryParse(data)

		if ('ext' in json) {
			metadata = json
			return true
		}

		return false
	}

	const loadGLTF = async (data: Blob) => {
		const buffer = await data.arrayBuffer()
		const blob = new Blob([buffer], { type: 'model/gltf-binary' })
		const url = URL.createObjectURL(blob)
		const gltf = await loader.loadAsync(url)
		models.push(new WorldObject(gltf.scene.name, undefined, undefined, undefined, { gltf }))
		URL.revokeObjectURL(url)
	}

	const scheduleReconnect = () => {
		setTimeout(() => {
			reconnectDelay = Math.min(reconnectDelay * 2, maxReconnectDelay)
			console.log(`Reconnecting in ${reconnectDelay / 1000} seconds...`)
			connect()
		}, this.reconnectDelay)
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
			if (metadata?.ext === 'glb') {
				loadGLTF(event.data)
			} else if (metadata?.ext === 'pcd') {
				addPcd(event.data)
			}
			return
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

		if ('poses' in data) {
			return addPoses(data.poses, data.colors, data.arrowHeadAtPose)
		}

		if ('geometry' in data) {
			addGeometry(data.geometry, data.color)
		}
	}

	const connect = () => {
		ws = new WebSocket(`ws://${BACKEND_IP}:${BUN_SERVER_PORT}/ws`)
		ws.onclose = onClose
		ws.onerror = onError
		ws.onopen = onOpen
		ws.onmessage = onMessage
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
