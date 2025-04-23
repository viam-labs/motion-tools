import { getContext, setContext } from 'svelte'
import {
	ArrowHelper,
	BoxGeometry,
	BufferAttribute,
	BufferGeometry,
	Color,
	MathUtils,
	Object3D,
	PointsMaterial,
	SphereGeometry,
	Vector3,
	Vector4,
} from 'three'
import { NURBSCurve } from 'three/addons/curves/NURBSCurve.js'
import { PLYLoader } from 'three/addons/loaders/PLYLoader.js'
import { DoubleSide, Mesh, MeshToonMaterial, Points } from 'three'
import { createGeometry, createPose, createPoseInFrame, poseToObject3d } from '$lib/transform'
import { parsePCD } from '$lib/loaders/pcd'
import { Line2 } from 'three/addons/lines/Line2.js'
import { LineMaterial } from 'three/addons/lines/LineMaterial.js'
import { LineGeometry } from 'three/addons/lines/LineGeometry.js'
import { meshBounds, useGltf } from '@threlte/extras'
import { CapsuleGeometry } from '$lib/CapsuleGeometry'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { createMesh } from '$lib/mesh'
import type { Geometry } from '@viamrobotics/sdk'
import { WorldObject } from '$lib/WorldObject'

type ConnectionStatus = 'connecting' | 'open' | 'closed'

interface Context {
	current: WorldObject[]
	points: WorldObject[]
	meshes: WorldObject[]
	poses: WorldObject[]
	nurbs: WorldObject[]
	models: Object3D[]
	connectionStatus: ConnectionStatus
}

const key = Symbol('websocket-context-key')

const plyLoader = new PLYLoader()

const tryParse = (json: string) => {
	try {
		return JSON.parse(json)
	} catch (error) {
		console.warn('Failed to parse JSON:', error)
		return
	}
}

let pointsIndex = 0
let poseIndex = 0

const direction = new Vector3()
const origin = new Vector3()

export const provideShapes = () => {
	const ip = (globalThis as unknown as { __BACKEND_IP__: string }).__BACKEND_IP__ ?? 'localhost'
	const ws = new WebSocket(`ws://${ip}:3001`)

	const current = $state<WorldObject[]>([])
	const points = $state<WorldObject[]>([])
	const meshes = $state<WorldObject[]>([])
	const poses = $state<WorldObject[]>([])
	const nurbs = $state<WorldObject[]>([])
	const models = $state<Object3D[]>([])

	let connectionStatus = $state<ConnectionStatus>('connecting')

	const loader = new GLTFLoader()

	const { load } = useGltf()

	const addPcd = async (data: any) => {
		const buffer = await (data as Blob).arrayBuffer()
		const { positions, colors } = await parsePCD(new Uint8Array(buffer))

		const worldObject = new WorldObject(
			`pointcloud ${++pointsIndex}`,
			undefined,
			new Float32Array(positions),
			{
				colors: colors ? new Float32Array(colors) : undefined,
			}
		)

		points.push(worldObject)
		// return worldObject

		// const geometry = new BufferGeometry()
		// const material = new PointsMaterial({
		// 	size: 0.01,
		// 	vertexColors: colors !== undefined,
		// 	color: new Color('#888888'),
		// })
		// geometry.setAttribute('position', new BufferAttribute(new Float32Array(positions), 3))

		// if (colors) {
		// 	geometry.setAttribute('color', new BufferAttribute(new Float32Array(colors), 3))
		// }

		// const result = new Points(geometry, material)

		// result.name = `points ${++pointsIndex}`
		// points.push(result)
	}

	const addGeometry = (data: any, color: string, parent?: string) => {
		const type: Geometry['geometryType'] = data.box
			? {
					case: 'box',
					value: data.box,
				}
			: data.sphere
				? {
						case: 'sphere',
						value: data.sphere,
					}
				: data.capsule
					? {
							case: 'capsule',
							value: data.capsule,
						}
					: data.mesh
						? {
								case: 'mesh',
								value: data.mesh,
							}
						: {
								case: undefined,
								value: undefined,
							}

		const geometry = createGeometry(type, data.label, data.center)

		const worldObject = new WorldObject(data.label, createPoseInFrame(data.center), geometry)

		current.push(worldObject)

		// current.push(
		// 	createMesh({
		// 		name: data.label,
		// 		parent,
		// 		pose: createPose(data.center),
		// 		geometry,
		// 		color,
		// 	})
		// )

		// const mesh = new Mesh()
		// mesh.name = data.label ?? MathUtils.generateUUID()
		// mesh.userData.parent = parent ?? 'world'
		// mesh.userData.pose = createPose(data.center)

		// poseToObject3d(mesh.userData.pose, mesh)
		// mesh.userData.color = color

		// if ('mesh' in data) {
		// 	if (data.mesh.contentType === 'ply') {
		// 		const geometry = plyLoader.parse(atob(data.mesh.mesh))
		// 		const material = new MeshToonMaterial({
		// 			color: color ?? 'purple',
		// 			side: DoubleSide,
		// 			transparent: true,
		// 			opacity: 0.7,
		// 		})
		// 		mesh.geometry = geometry
		// 		mesh.material = material
		// 		if (data.center) {
		// 			poseToObject3d(data.center, mesh)
		// 		}
		// 		mesh.raycast = meshBounds
		// 		mesh.name = data.label
		// 		meshes.push(mesh)
		// 		return
		// 	}
		// }

		// if ('box' in data) {
		// 	const dimsMm = data.box.dimsMm ?? { x: 0, y: 0, z: 0 }
		// 	mesh.geometry = new BoxGeometry(dimsMm.x * 0.001, dimsMm.y * 0.001, dimsMm.z * 0.001)
		// 	mesh.userData.geometry = createGeometry({ case: 'box', value: data.box })
		// } else if ('sphere' in data) {
		// 	const radiusMm = data.sphere.radiusMm ?? 0
		// 	mesh.geometry = new SphereGeometry(radiusMm * 0.001)
		// 	mesh.userData.geometry = createGeometry({ case: 'sphere', value: data.sphere })
		// } else if ('capsule' in data) {
		// 	const { lengthMm, radiusMm } = data.capsule
		// 	mesh.geometry = new CapsuleGeometry(radiusMm * 0.001, lengthMm * 0.001)
		// 	mesh.userData.geometry = createGeometry({ case: 'capsule', value: data.capsule })
		// }

		// current.push(mesh)
	}

	const addNurbs = (data: any, color: string) => {
		const controlPoints = data.ControlPts.map(
			(point: Vector3) => new Vector4(point.x / 1000, point.y / 1000, point.z / 1000)
		)
		const curve = new NURBSCurve(data.Degree, data.Knots, controlPoints)

		const geometry = new LineGeometry()
		geometry.setFromPoints(curve.getPoints(200))

		// const material = new LineMaterial()
		// material.color.set(color)

		// const line = new Line2(geometry, material)
		// line.name = data.name

		return new WorldObject(
			data.name,
			undefined,
			new Float32Array(geometry.getAttribute('positions').array),
			{ color }
		)

		// nurbs.push(line)
	}

	const addPoses = (nextPoses: any[], colors: string[], arrowHeadAtPose: boolean) => {
		for (let i = 0, l = nextPoses.length; i < l; i += 1) {
			const pose = nextPoses[i]
			const length = 0.05

			direction.set(pose.oX ?? 0, pose.oY ?? 0, pose.oZ ?? 0)
			origin.set((pose.x ?? 0) / 1000, (pose.y ?? 0) / 1000, (pose.z ?? 0) / 1000)

			if (arrowHeadAtPose) {
				// Compute the base position so the arrow ends at the origin
				origin.sub(direction.clone().multiplyScalar(length))
			}

			const arrow = new ArrowHelper(
				direction,
				origin,
				length,
				colors[i] ?? 'blue',
				0.25 * length,
				0.2 * length
			)

			arrow.userData.pose = createPose(pose)

			arrow.name = `pose ${++poseIndex}`

			// poses.push(arrow)
		}
	}

	const addGeometries = (geometries: any[], colors: string[], parent: string) => {
		let i = 0
		for (const geometry of geometries) {
			addGeometry(geometry, colors[i], parent)
			i += 1
		}
	}

	const removeAll = () => {
		current.splice(0, current.length)
		points.splice(0, points.length)
		meshes.splice(0, meshes.length)
		poses.splice(0, poses.length)
		nurbs.splice(0, nurbs.length)
		models.splice(0, models.length)

		pointsIndex = 0
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
		gltf.scene.userData.parent = 'world'
		models.push(gltf.scene)
		URL.revokeObjectURL(url)
	}

	const onOpen = () => {
		connectionStatus = 'open'
		console.log(`Connected to websocket server on IP: ${ip}`)
	}

	const onClose = () => {
		connectionStatus = 'closed'
		console.log('Disconnected from server')
	}

	const onError = (event: Event) => {
		console.log('Websocket error', JSON.stringify(event))
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

	ws.onclose = onClose
	ws.onerror = onError
	ws.onopen = onOpen
	ws.onmessage = onMessage

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
		get nurbs() {
			return nurbs
		},
		get models() {
			return models
		},
		get connectionStatus() {
			return connectionStatus
		},
	})
}

export const useShapes = () => {
	return getContext<Context>(key)
}
