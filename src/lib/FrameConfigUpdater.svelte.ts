import type { Pose } from '@viamrobotics/sdk'
import type { Entity } from 'koota'
import type { Vector3Like } from 'three'

import type { Frame } from '$lib/frame'

import { hierarchy, traits } from '$lib/ecs'
import { createPose, matrixTraitToPose, newMatrixTrait, poseToMatrixTrait } from '$lib/transform'

const matrixScratch = newMatrixTrait()
const poseScratch = createPose()

type UpdateFrameCallback = {
	(componentName: string, referenceFrame: string, pose: Pose, geometry?: Frame['geometry']): void
}

type RemoveFrameCallback = {
	(componentName: string): void
}

export class FrameConfigUpdater {
	private updateFrame: UpdateFrameCallback
	private removeFrame: RemoveFrameCallback

	constructor(updateFrame: UpdateFrameCallback, removeFrame: RemoveFrameCallback) {
		this.updateFrame = updateFrame
		this.removeFrame = removeFrame
	}

	public updateLocalPosition = (entity: Entity, position: Partial<Vector3Like>) => {
		const { x, y, z } = position

		if (x === undefined && y === undefined && z === undefined) return

		const current = entity.get(traits.EditedMatrix)
		if (!current) return
		matrixTraitToPose(current, poseScratch)
		if (x !== undefined) poseScratch.x = x
		if (y !== undefined) poseScratch.y = y
		if (z !== undefined) poseScratch.z = z

		entity.set(traits.EditedMatrix, poseToMatrixTrait(poseScratch, matrixScratch))

		const name = entity.get(traits.Name)
		const parent = hierarchy.getParentName(entity) ?? 'world'

		if (name) {
			this.updateFrame(name, parent, { ...poseScratch })
		}
	}

	public updateLocalOrientation = (
		entity: Entity,
		orientation: {
			oX?: number
			oY?: number
			oZ?: number
			theta?: number
		}
	) => {
		const { oX, oY, oZ, theta } = orientation

		if (oX === undefined && oY === undefined && oZ === undefined && theta === undefined) {
			return
		}

		const current = entity.get(traits.EditedMatrix)
		if (!current) return
		matrixTraitToPose(current, poseScratch)
		if (oX !== undefined) poseScratch.oX = oX
		if (oY !== undefined) poseScratch.oY = oY
		if (oZ !== undefined) poseScratch.oZ = oZ
		if (theta !== undefined) poseScratch.theta = theta

		entity.set(traits.EditedMatrix, poseToMatrixTrait(poseScratch, matrixScratch))

		const name = entity.get(traits.Name)
		const parent = hierarchy.getParentName(entity) ?? 'world'

		if (name) {
			this.updateFrame(name, parent, { ...poseScratch })
		}
	}

	public updateGeometry = (entity: Entity, geometry: Partial<Frame['geometry']>) => {
		const name = entity.get(traits.Name)
		const parent = hierarchy.getParentName(entity) ?? 'world'
		const matrix = entity.get(traits.EditedMatrix)
		if (matrix) matrixTraitToPose(matrix, poseScratch)

		if (geometry?.type === 'box') {
			const { x, y, z } = geometry

			if (x === undefined && y === undefined && z === undefined) return

			const change: { x?: number; y?: number; z?: number } = {}
			if (x !== undefined) change.x = x
			if (y !== undefined) change.y = y
			if (z !== undefined) change.z = z

			entity.set(traits.Box, change)

			const box = entity.get(traits.Box)

			if (name && box && matrix) {
				this.updateFrame(name, parent, { ...poseScratch }, { type: 'box', ...box })
			}
		} else if (geometry?.type === 'sphere') {
			const { r } = geometry

			if (r === undefined) return

			entity.set(traits.Sphere, { r })

			const sphere = entity.get(traits.Sphere)

			if (name && sphere && matrix) {
				this.updateFrame(name, parent, { ...poseScratch }, { type: 'sphere', ...sphere })
			}
		} else if (geometry?.type === 'capsule') {
			const { r, l } = geometry

			if (r === undefined && l === undefined) return

			const change: { r?: number; l?: number } = {}
			if (r !== undefined) change.r = r
			if (l !== undefined) change.l = l

			entity.set(traits.Capsule, change)

			const capsule = entity.get(traits.Capsule)

			if (name && capsule && matrix) {
				this.updateFrame(name, parent, { ...poseScratch }, { type: 'capsule', ...capsule })
			}
		}
	}

	public setFrameParent = (entity: Entity, parentName: string) => {
		const name = entity.get(traits.Name)
		const matrix = entity.get(traits.EditedMatrix)

		if (name && matrix) {
			matrixTraitToPose(matrix, poseScratch)
			this.updateFrame(name, parentName, { ...poseScratch })
		}
	}

	public deleteFrame = (entity: Entity) => {
		const name = entity.get(traits.Name)

		if (name) {
			this.removeFrame(name)
		}
	}

	public setGeometryType = (entity: Entity, type: 'none' | 'box' | 'sphere' | 'capsule') => {
		const name = entity.get(traits.Name)
		const parent = hierarchy.getParentName(entity) ?? 'world'
		const matrix = entity.get(traits.EditedMatrix)

		if (!name || !matrix) return
		matrixTraitToPose(matrix, poseScratch)
		const pose: Pose = { ...poseScratch }

		if (type === 'none') {
			this.updateFrame(name, parent, pose, { type: 'none' })
		} else if (type === 'box') {
			this.updateFrame(name, parent, pose, { type: 'box', x: 100, y: 100, z: 100 })
		} else if (type === 'sphere') {
			this.updateFrame(name, parent, pose, { type: 'sphere', r: 100 })
		} else if (type === 'capsule') {
			this.updateFrame(name, parent, pose, { type: 'capsule', r: 20, l: 100 })
		}
	}
}
