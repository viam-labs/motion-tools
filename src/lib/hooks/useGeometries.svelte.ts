import { useResources, useRobot } from '$lib/svelte-sdk'
import { ArmClient, CameraClient, Geometry, Pose, Transform } from '@viamrobotics/sdk'
import { setContext, getContext } from 'svelte'
import type { Frame } from './useFrames.svelte'

const key = Symbol('geometries-context')

interface Context {
	current: Frame[]
}

type JointPositions = Awaited<ReturnType<ArmClient['getJointPositions']>>

export const provideGeometries = () => {
	const robot = useRobot()
	const arms = useResources('arm')
	const cameras = useResources('camera')

	const clients = $derived.by(() => {
		const armClients = arms.current.map((arm) => new ArmClient(robot.client!, arm.name))
		const cameraClients = cameras.current.map(
			(camera) => new CameraClient(robot.client!, camera.name)
		)

		return [...armClients, ...cameraClients]
	})

	let geometries = $state<Frame[]>([])
	// let jointPositions = $state<JointPositions[]>([])

	$effect.pre(() => {
		for (const client of clients) {
			client.getGeometries().then((value) => {
				for (const item of value) {
					const pose = new Pose()
					geometries.push({
						name: item.label,
						parent: client.name,
						pose: item.center ?? new Pose(),
						physicalObject: item,
					})
				}
			})

			// if ('getJointPositions' in client) {
			// 	client.getJointPositions().then((value) => {
			// 		jointPositions.push(value)
			// 	})
			// }
		}
	})

	const context: Context = {
		get current() {
			return geometries
		},
	}

	setContext(key, context)
}

export const useGeometries = () => {
	return getContext<Context>(key)
}
