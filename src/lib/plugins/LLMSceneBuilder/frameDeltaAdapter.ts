import type { Pose, Transform } from '@viamrobotics/sdk'

import type { Frame } from '$lib/frame'
import type { FragmentInfo } from '$lib/hooks/useFragmentInfo.svelte'
import type { PartConfig } from '$lib/hooks/usePartConfig.svelte'

import { applyEulerDeltaToPose, createPose, createPoseFromFrame } from '$lib/transform'

/**
 * Resolves current frames for fragment-defined components from live framesystem
 * data and any config $set overrides. Returns a FragmentInfo map suitable for
 * validateProposedFrameDeltas and LLM inference.
 */
export function resolveFragmentCurrentFrames(
	fragmentNames: string[],
	fragmentInfo: Record<string, FragmentInfo>,
	liveFrames: Transform[],
	configFrames: Record<string, Transform>
): Record<string, FragmentInfo> {
	const liveByName: Record<string, Transform> = {}
	for (const frame of liveFrames) {
		liveByName[frame.referenceFrame] = frame
	}

	const result: Record<string, FragmentInfo> = {}
	for (const name of fragmentNames) {
		const meta = fragmentInfo[name]
		if (!meta) continue

		const observed = (configFrames[name] ?? liveByName[name])?.poseInObserverFrame
		if (!observed) continue

		const pose = createPose(observed.pose)

		result[name] = {
			id: meta.id,
			variables: meta.variables,
			frame: {
				parent: observed.referenceFrame,
				translation: {
					x: pose.x,
					y: pose.y,
					z: pose.z,
				},
				orientation: {
					type: 'ov_degrees',
					value: {
						x: pose.oX,
						y: pose.oY,
						z: pose.oZ,
						th: pose.theta,
					},
				},
			},
		}
	}

	return result
}

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
		const partComponent = config.components.find((c) => c.name === delta.componentName)
		// Fragment-defined components aren't in config.components; their current
		// frame comes from `fragmentFrames` (resolved from the live framesystem).
		// Part config wins when the same name exists in both.
		const fragmentEntry = partComponent ? undefined : fragmentFrames[delta.componentName]
		const frame = partComponent?.frame ?? fragmentEntry?.frame

		if (!partComponent && !fragmentEntry) {
			errors.push({ componentName: delta.componentName, reason: 'Component not found in config' })
			continue
		}

		if (!frame) {
			errors.push({
				componentName: delta.componentName,
				reason: fragmentEntry ? 'Fragment has no frame' : 'Component has no frame',
			})
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

		const previousPose = createPoseFromFrame(frame)
		const previousParent = frame.parent
		const geometry = frame.geometry

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
