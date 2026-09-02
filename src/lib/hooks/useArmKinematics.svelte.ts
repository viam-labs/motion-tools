import { ArmClient } from '@viamrobotics/sdk'
import {
	createResourceClient,
	createResourceQuery,
	useResourceStatuses,
} from '@viamrobotics/svelte-sdk'
import { getContext, setContext } from 'svelte'

const key = Symbol('arm-kinematics-context')

export interface JointLimit {
	id: string
	min: number
	max: number
}

interface Context {
	names: string[]
	kinematics: Record<string, JointLimit[] | undefined>
}

export const provideArmKinematics = (partID: () => string) => {
	const arms = useResourceStatuses(partID, 'arm')
	// Kinematics are static config data, so fetch once and cache indefinitely
	const options = { staleTime: Infinity, refetchOnMount: false, refetchInterval: false as const }

	const names = $derived(
		arms.current.map((arm) => arm.name?.name).filter((name): name is string => name !== undefined)
	)

	const clients = $derived(names.map((name) => createResourceClient(ArmClient, partID, () => name)))

	const kinematicsQueries = $derived(
		clients.map(
			(client) =>
				[client.name, createResourceQuery(client, 'getKinematics', () => options)] as const
		)
	)

	const kinematics = $derived(
		Object.fromEntries(
			kinematicsQueries.map(([name, query]) => {
				const data = query.data
				const joints = data && ('joints' in data ? data.joints : data.kinematicsData.joints)
				return [
					name,
					joints?.map((j) => ({
						id: j.id,
						min: j.min,
						max: j.max,
					})),
				]
			})
		)
	)

	setContext<Context>(key, {
		get names() {
			return names
		},
		get kinematics() {
			return kinematics
		},
	})
}

export const useArmKinematics = (): Context => {
	return getContext<Context>(key)
}
