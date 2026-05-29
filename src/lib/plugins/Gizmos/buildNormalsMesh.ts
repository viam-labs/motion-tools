import { type Entity } from 'koota'
import { BoxGeometry, type BufferGeometry, Mesh, MeshBasicMaterial, SphereGeometry } from 'three'

import { traits } from '$lib/ecs'
import { CapsuleGeometry } from '$lib/three/CapsuleGeometry'

const sharedMaterial = new MeshBasicMaterial()

export const buildNormalsMesh = (entity: Entity): Mesh | undefined => {
	const box = entity.get(traits.Box)
	if (box) return makeMesh(new BoxGeometry(box.x * 0.001, box.y * 0.001, box.z * 0.001))

	const sphere = entity.get(traits.Sphere)
	if (sphere) return makeMesh(new SphereGeometry((sphere.r ?? 0) * 0.001, 16, 12))

	const capsule = entity.get(traits.Capsule)
	if (capsule) return makeMesh(new CapsuleGeometry(capsule.r * 0.001, capsule.l * 0.001))

	const buffer = entity.get(traits.BufferGeometry)
	if (buffer) {
		if (buffer.attributes.normal) return makeMesh(buffer)
		const cloned = buffer.clone()
		cloned.computeVertexNormals()
		return makeMesh(cloned)
	}

	return undefined
}

const makeMesh = (geometry: BufferGeometry): Mesh => {
	const mesh = new Mesh(geometry, sharedMaterial)
	mesh.matrixAutoUpdate = false
	mesh.matrixWorldAutoUpdate = false
	return mesh
}
