import type { Pose } from '@viamrobotics/sdk'

import type { Frame } from '$lib/frame'
import type { FragmentInfo } from '$lib/hooks/useFragmentInfo.svelte'
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

function mergeTranslation(
	a?: FrameDelta['translation'],
	b?: FrameDelta['translation']
): FrameDelta['translation'] {
	return a || b ? { x: b?.x ?? a?.x, y: b?.y ?? a?.y, z: b?.z ?? a?.z } : undefined
}

function mergeOrientation(
	a?: FrameDelta['orientation'],
	b?: FrameDelta['orientation']
): FrameDelta['orientation'] {
	return a || b
		? { roll: b?.roll ?? a?.roll, pitch: b?.pitch ?? a?.pitch, yaw: b?.yaw ?? a?.yaw }
		: undefined
}

/**
 * Validates LLM-proposed frame deltas and computes the resulting changes without
 * applying them. Each PreparedUpdate carries old and new values so the caller
 * can render a diff and confirm via useSceneBuilder's confirm().
 */
export function validateProposedFrameDeltas(
	deltas: FrameDelta[],
	config: PartConfig,
	fragmentFrames: Record<string, FragmentInfo> = {}
): { errors: UpdateError[]; prepared: PreparedUpdate[] } {
	const errors: UpdateError[] = []
	const prepared: PreparedUpdate[] = []
	const knownNames = new Set([
		...config.components.map((c) => c.name),
		...Object.keys(fragmentFrames),
	])

	// Merge multiple deltas for the same component — the LLM sometimes splits
	// translation and orientation into separate entries despite the schema saying one per component.
	const mergedDeltas = new Map<string, FrameDelta>()
	for (const delta of deltas) {
		const existing = mergedDeltas.get(delta.componentName)
		if (existing) {
			mergedDeltas.set(delta.componentName, {
				componentName: delta.componentName,
				translation: mergeTranslation(existing.translation, delta.translation),
				orientation: mergeOrientation(existing.orientation, delta.orientation),
				parent: delta.parent ?? existing.parent,
				explanation:
					[existing.explanation, delta.explanation].filter(Boolean).join(', ') || undefined,
			})
		} else {
			mergedDeltas.set(delta.componentName, delta)
		}
	}

	for (const delta of mergedDeltas.values()) {
		const component = config.components.find((c) => c.name === delta.componentName)
		// Fragment-defined components aren't in config.components; their current
		// frame comes from `fragmentFrames` (resolved from the live framesystem).
		const fragment = component ? undefined : fragmentFrames[delta.componentName]

		if (!component && !fragment) {
			errors.push({ componentName: delta.componentName, reason: 'Component not found in config' })
			continue
		}

		if (component && !component.frame) {
			errors.push({ componentName: delta.componentName, reason: 'Component has no frame' })
			continue
		}

		if (fragment && !fragment.frame) {
			errors.push({ componentName: delta.componentName, reason: 'Fragment has no frame' })
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

		const previousPose = component
			? createPoseFromFrame(component.frame!)
			: createPoseFromFrame(fragment!.frame!)
		const previousParent = component ? component.frame!.parent : fragment!.frame!.parent
		const geometry = component ? component.frame!.geometry : fragment!.frame!.geometry

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
			geometry,
			explanation: delta.explanation,
		})
	}

	return { errors, prepared }
}
