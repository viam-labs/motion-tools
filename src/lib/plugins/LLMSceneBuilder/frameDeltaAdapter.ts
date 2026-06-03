import type { Pose } from '@viamrobotics/sdk'

import type { Frame } from '$lib/frame'
import type { PartConfig } from '$lib/hooks/usePartConfig.svelte'

import { applyEulerDeltaToPose, createPoseFromFrame } from '$lib/transform'

export interface FrameDelta {
	componentName: string
	translation?: { x?: number; y?: number; z?: number }
	orientation?: { roll?: number; pitch?: number; yaw?: number }
	parent?: string
	explanation?: string
}

export interface PreparedUpdate {
	componentName: string
	parent: string
	previousParent: string
	pose: Pose
	previousPose: Pose
	geometry?: Frame['geometry']
	explanation?: string
}

export interface UpdateError {
	componentName: string
	reason: string
}

/**
 * Validates LLM-proposed frame deltas and computes the resulting changes without
 * applying them. Each PreparedUpdate carries old and new values so the caller
 * can render a diff and confirm via useSceneBuilder's confirm().
 */
export function validateProposedFrameDeltas(
	deltas: FrameDelta[],
	config: PartConfig
): { errors: UpdateError[]; prepared: PreparedUpdate[] } {
	const errors: UpdateError[] = []
	const prepared: PreparedUpdate[] = []
	const knownNames = new Set(config.components.map((c) => c.name))

	for (const delta of deltas) {
		const component = config.components.find((c) => c.name === delta.componentName)

		if (!component) {
			errors.push({ componentName: delta.componentName, reason: 'Component not found in config' })
			continue
		}

		if (!component.frame) {
			errors.push({ componentName: delta.componentName, reason: 'Component has no frame' })
			continue
		}

		if (
			delta.parent !== undefined &&
			delta.parent !== 'world' &&
			(!knownNames.has(delta.parent) || delta.parent === delta.componentName)
		) {
			errors.push({
				componentName: delta.componentName,
				reason:
					delta.parent === delta.componentName
						? `Component cannot be its own parent`
						: `Parent '${delta.parent}' not found in config`,
			})
			continue
		}

		const previousPose = createPoseFromFrame(component.frame)
		const previousParent = component.frame.parent

		const newParent = delta.parent ?? previousParent
		const newPose: Pose = {
			x: delta.translation?.x ?? previousPose.x,
			y: delta.translation?.y ?? previousPose.y,
			z: delta.translation?.z ?? previousPose.z,
			oX: previousPose.oX,
			oY: previousPose.oY,
			oZ: previousPose.oZ,
			theta: previousPose.theta,
		}

		if (delta.orientation) {
			applyEulerDeltaToPose(previousPose, delta.orientation, newPose)
		}

		if (
			[newPose.x, newPose.y, newPose.z, newPose.oX, newPose.oY, newPose.oZ, newPose.theta].some(
				(v) => !Number.isFinite(v)
			)
		) {
			errors.push({
				componentName: delta.componentName,
				reason: 'Proposed values contain non-finite numbers',
			})
			continue
		}

		prepared.push({
			componentName: delta.componentName,
			parent: newParent,
			previousParent,
			pose: newPose,
			previousPose,
			geometry: component.frame.geometry,
			explanation: delta.explanation,
		})
	}

	return { errors, prepared }
}
