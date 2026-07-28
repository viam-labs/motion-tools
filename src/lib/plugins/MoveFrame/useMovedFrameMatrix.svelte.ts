import type { commonApi } from '@viamrobotics/sdk'
import type { Matrix4 } from 'three'

import { createRobotQuery, useRobotClient } from '@viamrobotics/svelte-sdk'

import { RefetchRates } from '$lib/components/overlay/RefreshRate.svelte'
import { RefreshRates, useSettings } from '$lib/hooks/useSettings.svelte'
import { Pose } from '$lib/math'

const tempPose = new Pose()

export interface MovedFrameMatrix {
	readonly current: Matrix4 | undefined
}

/**
 * The world transform of the frame the motion service actually drives.
 *
 * For an arm, gantry, gripper or base the frame system reports the *mount*
 * under `<name>_origin` and the *end effector* under the bare component name —
 * and the bare name is what `MotionClient.move` takes. The scene renders these
 * components at their origin (see `usePoses`), so no entity carries the end
 * effector's transform; ask the frame system for it directly. Frames without a
 * kinematic model resolve to the transform their entity already has.
 *
 * Resolved against `world` so the gizmo can be dragged and committed in the one
 * space both ends agree on, with no `_origin` ambiguity in between.
 */
export const useMovedFrameMatrix = (
	partID: () => string,
	frameName: () => string,
	enabled: () => boolean
): MovedFrameMatrix => {
	const settings = useSettings()
	const client = useRobotClient(partID)

	const interval = $derived(settings.current.refreshRates[RefreshRates.poses])

	const query = createRobotQuery(
		client,
		'getPose',
		() => [frameName(), 'world', []] as [string, string, commonApi.Transform[]],
		() => ({
			enabled: enabled() && partID() !== '',
			refetchInterval:
				interval === RefetchRates.OFF || interval === RefetchRates.MANUAL
					? (false as const)
					: interval,
		})
	)

	const current = $derived.by(() => {
		const pose = query.data?.pose
		return pose ? tempPose.copy(pose).toMatrix4() : undefined
	})

	return {
		get current() {
			return current
		},
	}
}
