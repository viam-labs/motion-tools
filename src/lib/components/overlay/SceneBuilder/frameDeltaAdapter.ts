import type { Pose } from '@viamrobotics/sdk'

import type { Frame } from '$lib/frame'
import type { PartConfig } from '$lib/hooks/usePartConfig.svelte'

import { createPoseFromFrame } from '$lib/transform'

export interface FrameDelta {
	componentName: string
	translation?: { x?: number; y?: number; z?: number }
	/** Full orientation replacement as ov_degrees { x, y, z, th } */
	orientation?: { x: number; y: number; z: number; th: number }
	parent?: string
}

export interface PreparedUpdate {
	componentName: string
	parent: string
	previousParent: string
	pose: Pose
	previousPose: Pose
	geometry?: Frame['geometry']
}

export interface UpdateError {
	componentName: string
	reason: string
}

interface Deps {
	updateFrame: (name: string, parent: string, pose: Pose, geometry?: Frame['geometry']) => void
}

/**
 * Validates LLM-proposed frame deltas and computes the resulting changes without
 * applying them. Each PreparedUpdate carries old and new values so the caller
 * can render a diff and pass the result to applyPreparedUpdates() on confirmation.
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
			oX: delta.orientation?.x ?? previousPose.oX,
			oY: delta.orientation?.y ?? previousPose.oY,
			oZ: delta.orientation?.z ?? previousPose.oZ,
			theta: delta.orientation?.th ?? previousPose.theta,
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
		})
	}

	return { errors, prepared }
}

/**
 * Applies previously validated and prepared frame updates to the config.
 * Call this on user confirmation after validateProposedFrameDeltas().
 */
export function applyPreparedUpdates(prepared: PreparedUpdate[], deps: Deps): void {
	for (const update of prepared) {
		deps.updateFrame(update.componentName, update.parent, update.pose, update.geometry)
	}
}
