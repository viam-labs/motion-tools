import { getContext, setContext } from 'svelte'
import { ArrowHelper, MathUtils, MeshBasicMaterial, SphereGeometry, Vector3 } from 'three'
import { Geometry, Pose } from '@viamrobotics/sdk'
import { PCDLoader } from 'three/addons/loaders/PCDLoader.js'
import { PLYLoader } from 'three/addons/loaders/PLYLoader.js'
import { DoubleSide, Mesh, MeshToonMaterial, type Points } from 'three'
import { createGeometry, createPose, poseToObject3d } from '$lib/transform'
import { parsePCD } from '$lib/loaders/pcd'

interface Frame {
	name: string
	parent: string
	geometry: Geometry
	pose: Pose
	color: string
}

interface Context {
	current: Frame[]
	points: Points[]
	meshes: Mesh[]
	poses: ArrowHelper[]
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
let poseIndex = 0

const direction = new Vector3()
const origin = new Vector3()

export const provideShapes = () => {
	const ws = new WebSocket('ws://localhost:3001')
	const current = $state<Frame[]>([])
	const points = $state<Points[]>([])
	const meshes = $state<Mesh[]>([])
	const poses = $state<ArrowHelper[]>([])

	ws.onopen = () => {
		console.log('Connected to websocket server')
	}

	const addPcd = async (data: any) => {
		const buffer = await (data as Blob).arrayBuffer()
		// parsePCD(new Uint8Array(buffer)).then((value) => {
		// 	console.log(value)
		// })
		const result = pcdLoader.parse(new Uint8Array(buffer).buffer)
		result.name = `points ${++index}`
		points.push(result)
	}

	const addMesh = (data: any, color: string) => {
		if (data.mesh.contentType === 'ply') {
			const geometry = plyLoader.parse(atob(data.mesh.mesh))
			const material = new MeshToonMaterial({
				color: color ?? 'purple',
				side: DoubleSide,
				transparent: true,
				opacity: 0.7,
			})
			const mesh = new Mesh(geometry, material)
			poseToObject3d(data.center, mesh)
			mesh.name = data.label
			meshes.push(mesh)
		}
	}

	const addShape = (data: any, color: string) => {
		if (data.mesh) {
			return addMesh(data, color)
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
			name: data.label ?? MathUtils.generateUUID(),
			parent: 'world',
			geometry,
			pose: createPose(data.center),
			color,
		}

		current.push(object)
	}

	const addPoses = (nextPoses: any[], colors: string[]) => {
		for (let i = 0, l = nextPoses.length; i < l; i += 1) {
			const pose = nextPoses[i]

			direction.set(pose.o_x ?? 0, pose.o_y ?? 0, pose.o_z ?? 0)
			origin.set((pose.x ?? 0) / 1000, (pose.y ?? 0) / 1000, (pose.z ?? 0) / 1000)
			const length = 0.05
			const arrow = new ArrowHelper(
				direction,
				origin,
				length,
				colors[i] ?? 'blue',
				0.25 * length,
				0.2 * length
			)
			arrow.name = `pose ${poseIndex++}`
			poses.push(arrow)
		}
	}

	ws.onmessage = (event) => {
		if (typeof event.data === 'object' && 'arrayBuffer' in event.data) {
			addPcd(event.data)
		}

		const data = tryParse(event.data)

		if (!data) return

		if ('poses' in data) {
			return addPoses(data.poses, data.colors)
		}

		addShape(data.geometry, data.color)
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
		get poses() {
			return poses
		},
	})
}

export const useShapes = () => {
	return getContext<Context>(key)
}
