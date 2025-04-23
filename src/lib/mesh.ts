import type { Geometry, Pose } from '@viamrobotics/sdk'
import { Mesh, MeshToonMaterial, BoxGeometry, DoubleSide, SphereGeometry } from 'three'
import { poseToObject3d } from './transform'
import { PLYLoader } from 'three/examples/jsm/loaders/PLYLoader.js'
import { meshBounds } from '@threlte/extras'
import { CapsuleGeometry } from './CapsuleGeometry'

const plyLoader = new PLYLoader()

export const createMesh = ({
	name,
	parent = 'world',
	pose,
	geometry,
	color = 'red',
}: {
	pose: Pose
	name?: string
	parent?: string
	geometry?: Geometry
	color?: string
}) => {
	const mesh = new Mesh()
	mesh.name = name ?? mesh.uuid
	mesh.userData.parent = parent
	mesh.userData.pose = pose
	mesh.userData.geometry = geometry
	mesh.userData.color = color

	if (pose) {
		poseToObject3d(pose, mesh)
	}

	if (geometry?.geometryType.case === 'mesh') {
		const geo = plyLoader.parse(atob(geometry.geometryType.value.mesh))
		const material = new MeshToonMaterial({
			color: color ?? 'purple',
			side: DoubleSide,
			transparent: true,
			opacity: 0.7,
		})
		if (geometry.center) {
			poseToObject3d(geometry.center, mesh)
		}
		mesh.raycast = meshBounds
		mesh.name = geometry.label
		mesh.geometry = geo
		mesh.material = material

		return mesh
	}

	const material = new MeshToonMaterial({ color, transparent: true, opacity: 0.7 })
	mesh.material = material

	if (geometry?.geometryType.case === 'box') {
		const dimsMm = geometry.geometryType.value.dimsMm ?? { x: 0, y: 0, z: 0 }
		mesh.geometry = new BoxGeometry(dimsMm.x * 0.001, dimsMm.y * 0.001, dimsMm.z * 0.001)
	} else if (geometry?.geometryType.case === 'sphere') {
		const radiusMm = geometry.geometryType.value.radiusMm ?? 0
		mesh.geometry = new SphereGeometry(radiusMm * 0.001)
	} else if (geometry?.geometryType.case === 'capsule') {
		const { lengthMm, radiusMm } = geometry.geometryType.value
		mesh.geometry = new CapsuleGeometry(radiusMm * 0.001, lengthMm * 0.001)
	} else {
		mesh.geometry = undefined
	}

	return mesh
}
