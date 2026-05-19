import type { Pose } from '@viamrobotics/sdk'
import type { Entity } from 'koota'
import type { Vector3Like } from 'three'

import type { Frame } from '$lib/frame'

import { hierarchy, traits } from '$lib/ecs'
import { createPose, matrixToPose, poseToMatrix } from '$lib/transform'

const tempPose = createPose()

/**
 * Picks the matrix trait to edit. Config-backed frames (with FramesAPI) stage
 * changes in EditedMatrix and round-trip through the robot config; local
 * Removable entities write directly to Matrix and skip the config call.
 */
const getEditTarget = (entity: Entity) => {
	if (entity.has(traits.FramesAPI)) {
		const matrix = entity.get(traits.EditedMatrix)
		if (!matrix) return undefined
		return { matrix, trait: traits.EditedMatrix, persisted: true as const }
	}

	const matrix = entity.get(traits.Matrix)
	if (!matrix) return undefined
	return { matrix, trait: traits.Matrix, persisted: false as const }
}

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

		const target = getEditTarget(entity)
		if (!target) return
		matrixToPose(target.matrix, tempPose)
		if (x !== undefined) tempPose.x = x
		if (y !== undefined) tempPose.y = y
		if (z !== undefined) tempPose.z = z

		poseToMatrix(tempPose, target.matrix)
		entity.changed(target.trait)

		if (target.persisted) {
			const name = entity.get(traits.Name)
			const parent = hierarchy.getParentName(entity) ?? 'world'

			if (name) {
				this.updateFrame(name, parent, { ...tempPose })
			}
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

		const target = getEditTarget(entity)
		if (!target) return
		matrixToPose(target.matrix, tempPose)
		if (oX !== undefined) tempPose.oX = oX
		if (oY !== undefined) tempPose.oY = oY
		if (oZ !== undefined) tempPose.oZ = oZ
		if (theta !== undefined) tempPose.theta = theta

		poseToMatrix(tempPose, target.matrix)
		entity.changed(target.trait)

		if (target.persisted) {
			const name = entity.get(traits.Name)
			const parent = hierarchy.getParentName(entity) ?? 'world'

			if (name) {
				this.updateFrame(name, parent, { ...tempPose })
			}
		}
	}

	public updateGeometry = (entity: Entity, geometry: Partial<Frame['geometry']>) => {
		const isPersisted = entity.has(traits.FramesAPI)
		const name = entity.get(traits.Name)
		const parent = hierarchy.getParentName(entity) ?? 'world'
		const matrix = isPersisted ? entity.get(traits.EditedMatrix) : entity.get(traits.Matrix)
		if (matrix) matrixToPose(matrix, tempPose)

		if (geometry?.type === 'box') {
			const { x, y, z } = geometry

			if (x === undefined && y === undefined && z === undefined) return

			const change: { x?: number; y?: number; z?: number } = {}
			if (x !== undefined) change.x = x
			if (y !== undefined) change.y = y
			if (z !== undefined) change.z = z

			entity.set(traits.Box, change)

			const box = entity.get(traits.Box)

			if (isPersisted && name && box && matrix) {
				this.updateFrame(name, parent, { ...tempPose }, { type: 'box', ...box })
			}
		} else if (geometry?.type === 'sphere') {
			const { r } = geometry

			if (r === undefined) return

			entity.set(traits.Sphere, { r })

			const sphere = entity.get(traits.Sphere)

			if (isPersisted && name && sphere && matrix) {
				this.updateFrame(name, parent, { ...tempPose }, { type: 'sphere', ...sphere })
			}
		} else if (geometry?.type === 'capsule') {
			const { r, l } = geometry

			if (r === undefined && l === undefined) return

			const change: { r?: number; l?: number } = {}
			if (r !== undefined) change.r = r
			if (l !== undefined) change.l = l

			entity.set(traits.Capsule, change)

			// Persisted updates send the full geometry object through partConfig,
			// so we re-read after the partial set.
			const capsule = entity.get(traits.Capsule)

			if (isPersisted && name && capsule && matrix) {
				this.updateFrame(name, parent, { ...tempPose }, { type: 'capsule', ...capsule })
			}
		}
	}

	public setFrameParent = (entity: Entity, parentName: string) => {
		if (!entity.has(traits.FramesAPI)) return
		const name = entity.get(traits.Name)
		const matrix = entity.get(traits.EditedMatrix)

		if (name && matrix) {
			matrixToPose(matrix, tempPose)
			this.updateFrame(name, parentName, { ...tempPose })
		}
	}

	public deleteFrame = (entity: Entity) => {
		const name = entity.get(traits.Name)

		if (name) {
			this.removeFrame(name)
		}
	}

	public setGeometryType = (
		entity: Entity,
		type: 'none' | 'box' | 'sphere' | 'capsule' | 'plane'
	) => {
		if (entity.has(traits.FramesAPI)) {
			// Plane isn't a partConfig geometry type, so frames can't be planes.
			if (type === 'plane') return

			const name = entity.get(traits.Name)
			const parent = hierarchy.getParentName(entity) ?? 'world'
			const matrix = entity.get(traits.EditedMatrix)

			if (!name || !matrix) return
			matrixToPose(matrix, tempPose)
			const pose: Pose = { ...tempPose }

			if (type === 'none') {
				this.updateFrame(name, parent, pose, { type: 'none' })
			} else if (type === 'box') {
				this.updateFrame(name, parent, pose, { type: 'box', x: 100, y: 100, z: 100 })
			} else if (type === 'sphere') {
				this.updateFrame(name, parent, pose, { type: 'sphere', r: 100 })
			} else if (type === 'capsule') {
				this.updateFrame(name, parent, pose, { type: 'capsule', r: 20, l: 100 })
			}
			return
		}

		// Local entities — swap geometry traits directly.
		entity.remove(traits.Box, traits.Sphere, traits.Capsule, traits.Plane)

		if (type === 'box') {
			entity.add(traits.Box({ x: 200, y: 200, z: 200 }))
		} else if (type === 'sphere') {
			entity.add(traits.Sphere({ r: 100 }))
		} else if (type === 'capsule') {
			entity.add(traits.Capsule({ r: 50, l: 200 }))
		} else if (type === 'plane') {
			entity.add(traits.Plane({ x: 500, y: 500 }))
		}
	}
}
