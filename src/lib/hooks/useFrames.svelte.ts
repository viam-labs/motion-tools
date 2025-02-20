import { useRobot } from '$lib/svelte-sdk'
import { Geometry, Pose } from '@viamrobotics/sdk'

export interface Frame {
	name: string
	parent: string
	pose: Pose
	physicalObject: Geometry
}

let frames = $state<Frame[]>([])

export const provideFrames = () => {
	const robot = useRobot()

	$effect.pre(() => {
		robot.client?.robotService.frameSystemConfig({}).then((value) => {
			frames = value.frameSystemConfigs.map((config) => {
				return {
					name: config.frame?.referenceFrame ?? '',
					parent: config.frame?.poseInObserverFrame?.referenceFrame ?? 'world',
					pose: config.frame?.poseInObserverFrame?.pose ?? new Pose(),
					physicalObject: config.frame?.physicalObject ?? new Geometry(),
				}
			})
		})
	})
}

export const useFrames = () => {
	return {
		get current() {
			return frames
		},
	}
}
