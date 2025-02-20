import { getContext, setContext } from 'svelte'
import { useRobotClient } from '../client'
import { usePartID } from './usePartID.svelte'

const key = Symbol('robot-context-key')

export const provideRobotContext = () => {
	const partID = usePartID()
	const robot = useRobotClient(partID)

	setContext(key, robot)
}

export const useRobot = (): ReturnType<typeof useRobotClient> => {
	return getContext(key)
}
