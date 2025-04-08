import { getContext, setContext } from 'svelte'
import {
	ArrowHelper,
	BufferAttribute,
	BufferGeometry,
	Color,
	MathUtils,
	PointsMaterial,
	Vector3,
	Vector4,
} from 'three'
import { Geometry, Pose } from '@viamrobotics/sdk'
import { NURBSCurve } from 'three/addons/curves/NURBSCurve.js'
import { PLYLoader } from 'three/addons/loaders/PLYLoader.js'
import { DoubleSide, Mesh, MeshToonMaterial, Points } from 'three'
import { createGeometry, createPose, poseToObject3d } from '$lib/transform'
import { parsePCD } from '$lib/loaders/pcd'
import { Line2 } from 'three/addons/lines/Line2.js'
import { LineMaterial } from 'three/addons/lines/LineMaterial.js'
import { LineGeometry } from 'three/addons/lines/LineGeometry.js'
import { meshBounds } from '@threlte/extras'

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
	nurbs: Line2[]
}

const key = Symbol('websocket-context-key')

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
	const ws = new WebSocket(
		`ws://${(globalThis as unknown as { __BACKEND_IP__: string }).__BACKEND_IP__}:3001`
	)
	const current = $state<Frame[]>([])
	const points = $state<Points[]>([])
	const meshes = $state<Mesh[]>([])
	const poses = $state<ArrowHelper[]>([])
	const nurbs = $state<Line2[]>([])

	ws.onopen = () => {
		console.log('Connected to websocket server')
	}

	const addPcd = async (data: any) => {
		const buffer = await (data as Blob).arrayBuffer()
		const { positions, colors } = await parsePCD(new Uint8Array(buffer))
		const geometry = new BufferGeometry()
		const material = new PointsMaterial({
			size: 0.01,
			vertexColors: colors !== undefined,
			color: new Color('#888888'),
		})
		geometry.setAttribute('position', new BufferAttribute(new Float32Array(positions), 3))

		if (colors) {
			geometry.setAttribute('color', new BufferAttribute(new Float32Array(colors), 3))
		}

		const result = new Points(geometry, material)

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
			console.log(data)
			poseToObject3d(data.center, mesh)
			mesh.raycast = meshBounds
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

	const addNurbs = (data: any, color: string) => {
		const controlPoints = data.ControlPts.map(
			(point) => new Vector4(point.x / 1000, point.y / 1000, point.z / 1000)
		)
		const curve = new NURBSCurve(data.Degree, data.Knots, controlPoints)

		const geometry = new LineGeometry()
		geometry.setFromPoints(curve.getPoints(200))

		const material = new LineMaterial()
		material.color.set(color)

		const line = new Line2(geometry, material)
		line.name = data.name

		nurbs.push(line)
	}

	const addPoses = (nextPoses: any[], colors: string[], arrowHeadAtPose: boolean) => {
		for (let i = 0, l = nextPoses.length; i < l; i += 1) {
			const pose = nextPoses[i]
			const length = 0.05

			direction.set(pose.o_x ?? 0, pose.o_y ?? 0, pose.o_z ?? 0)
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
			arrow.name = `pose ${poseIndex++}`
			poses.push(arrow)
		}
	}

	const removeAll = () => {
		current.splice(0, current.length)
		points.splice(0, points.length)
		meshes.splice(0, meshes.length)
		poses.splice(0, poses.length)
		nurbs.splice(0, nurbs.length)
	}

	ws.onmessage = (event) => {
		if (typeof event.data === 'object' && 'arrayBuffer' in event.data) {
			addPcd(event.data)
		}

		const data = tryParse(event.data)

		if (!data) return

		if ('removeAll' in data) {
			return removeAll()
		}

		if ('Knots' in data) {
			return addNurbs(data, data.Color)
		}

		if ('poses' in data) {
			return addPoses(data.poses, data.colors, data.arrowHeadAtPose)
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
		get nurbs() {
			return nurbs
		},
	})
}

export const useShapes = () => {
	return getContext<Context>(key)
}
