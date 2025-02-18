import { useRobotClient } from '../client'
import { usePartID } from './usePartID.svelte'

let robot = $state<ReturnType<typeof useRobotClient>>()

export const provideRobotContext = () => {
	const partID = usePartID()

	$effect(() => {
		robot = useRobotClient(partID.current)
	})
}

export const useRobot = () => {
	return {
		get current() {
			return robot
		},
	}
}
