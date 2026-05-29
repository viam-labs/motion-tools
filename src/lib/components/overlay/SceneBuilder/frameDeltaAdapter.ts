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

export interface AppliedChange {
	componentName: string
	field: string
	oldValue: string
	newValue: string
}

export interface UpdateError {
	componentName: string
	reason: string
}

export interface AdapterResult {
	applied: AppliedChange[]
	errors: UpdateError[]
}

interface Deps {
	updateFrame: (name: string, parent: string, pose: Pose, geometry?: Frame['geometry']) => void
}

/**
 * Applies LLM-proposed frame deltas to the current config via updateFrame().
 * Captures old values before applying so the caller can render a diff table.
 * Invalid deltas are collected in errors and never applied.
 */
export function applyFrameDeltas(
	deltas: FrameDelta[],
	config: PartConfig,
	deps: Deps
): AdapterResult {
	const applied: AppliedChange[] = []
	const errors: UpdateError[] = []
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

		const currentPose = createPoseFromFrame(component.frame)
		const currentParent = component.frame.parent

		const newParent = delta.parent ?? currentParent
		const newPose: Pose = {
			x: delta.translation?.x ?? currentPose.x,
			y: delta.translation?.y ?? currentPose.y,
			z: delta.translation?.z ?? currentPose.z,
			oX: delta.orientation?.x ?? currentPose.oX,
			oY: delta.orientation?.y ?? currentPose.oY,
			oZ: delta.orientation?.z ?? currentPose.oZ,
			theta: delta.orientation?.th ?? currentPose.theta,
		}

		const poseValues = [newPose.x, newPose.y, newPose.z, newPose.oX, newPose.oY, newPose.oZ, newPose.theta]
		if (poseValues.some((v) => !Number.isFinite(v))) {
			errors.push({
				componentName: delta.componentName,
				reason: 'Proposed values contain non-finite numbers',
			})
			continue
		}

		if (newParent !== currentParent) {
			applied.push({
				componentName: delta.componentName,
				field: 'parent',
				oldValue: currentParent,
				newValue: newParent,
			})
		}
		if (delta.translation?.x !== undefined) {
			applied.push({
				componentName: delta.componentName,
				field: 'translation.x',
				oldValue: String(currentPose.x),
				newValue: String(newPose.x),
			})
		}
		if (delta.translation?.y !== undefined) {
			applied.push({
				componentName: delta.componentName,
				field: 'translation.y',
				oldValue: String(currentPose.y),
				newValue: String(newPose.y),
			})
		}
		if (delta.translation?.z !== undefined) {
			applied.push({
				componentName: delta.componentName,
				field: 'translation.z',
				oldValue: String(currentPose.z),
				newValue: String(newPose.z),
			})
		}
		if (delta.orientation !== undefined) {
			const fmt = (p: Pose) => `(${p.oX}, ${p.oY}, ${p.oZ}) @ ${p.theta}°`
			applied.push({
				componentName: delta.componentName,
				field: 'orientation',
				oldValue: fmt(currentPose),
				newValue: fmt(newPose),
			})
		}

		deps.updateFrame(delta.componentName, newParent, newPose, component.frame.geometry)
	}

	return { applied, errors }
}
