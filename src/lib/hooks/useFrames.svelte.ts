import { useRobot } from '$lib/svelte-sdk'
import { Geometry, Pose, RobotClient } from '@viamrobotics/sdk'
// import { Object3D } from 'three'

// type Client = InstanceType<typeof RobotClient>
// type FrameSystemConfigs = Awaited<ReturnType<Client['frameSystemConfig']>>

interface Frame {
	name: string
	pose: Pose
	physicalObject: Geometry
}

let frames = $state<Frame[]>([])

export const provideFrames = () => {
	const robot = useRobot()
	const client = $derived(robot.current?.client)

	$effect.pre(() => {
		return client?.subscribe(($client) => {
			$client?.robotService.frameSystemConfig({}).then((value) => {
				frames = value.frameSystemConfigs.map((config) => {
					return {
						name: config.frame?.referenceFrame ?? '',
						pose: config.frame?.poseInObserverFrame?.pose ?? new Pose(),
						physicalObject: config.frame?.physicalObject ?? new Geometry(),
					}

					// const pose = config.frame?.poseInObserverFrame?.pose
					// const physicalObject = config.frame?.physicalObject
					// const object3d = new Object3D()

					// object3d.name = config.frame?.referenceFrame ?? ''

					// object3d.position.set(pose?.x ?? 0, pose?.y ?? 0, pose?.z ?? 0).multiplyScalar(0.001)

					// object3d.userData.geometryType = physicalObject?.geometryType

					// if (physicalObject?.geometryType.case === 'box') {
					// 	const dims = physicalObject.geometryType.value.dimsMm
					// 	object3d.scale.set(dims?.x ?? 0, dims?.y ?? 0, dims?.z ?? 0).multiplyScalar(0.001)
					// } else if (physicalObject?.geometryType.case === 'sphere') {
					// 	object3d.scale
					// 		.setScalar(physicalObject.geometryType.value.radiusMm)
					// 		.multiplyScalar(0.001)
					// }

					// object3d.updateMatrix()
					// object3d.updateMatrixWorld(true)
					// return object3d
				})
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
