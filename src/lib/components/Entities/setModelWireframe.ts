import type { Material, Object3D } from 'three'

import { isInstanceOf } from '@threlte/core'

interface WireframeMaterial extends Material {
	wireframe: boolean
}

const isWireframeMaterial = (material: Material): material is WireframeMaterial =>
	'wireframe' in material

/**
 * Draws every mesh under `object` as a wireframe, or restores it.
 *
 * A loaded model keeps the materials it shipped with, so `createSurfaceMaterial`
 * never reaches it and wireframe mode has to flip the flag in place. Clones share
 * their source's materials, so calling this on any clone covers all of them.
 */
export const setModelWireframe = (object: Object3D, wireframe: boolean) => {
	object.traverse((child) => {
		if (!isInstanceOf(child, 'Mesh')) return

		const materials = Array.isArray(child.material) ? child.material : [child.material]

		for (const material of materials) {
			if (isWireframeMaterial(material)) {
				material.wireframe = wireframe
			}
		}
	})
}
