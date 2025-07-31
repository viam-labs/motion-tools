import { createResourceClient, createResourceQuery } from '@viamrobotics/svelte-sdk'
import { usePartID } from './usePartID.svelte'
import { MotionClient, ResourceName } from '@viamrobotics/sdk'
import { useMachineSettings } from './useMachineSettings.svelte'
import { useMotionClient } from './useMotionClient.svelte'

export const usePose = (resourceName: () => ResourceName, parent: () => string | undefined) => {
	const { refreshRates } = useMachineSettings()
	const partID = usePartID()
	const motionClient = useMotionClient()

	const client = createResourceClient(
		MotionClient,
		() => partID.current,
		() => motionClient.current ?? ''
	)

	const resource = $derived(resourceName())
	const interval = $derived(refreshRates.get('Poses') ?? 1000)
	const options = $derived({
		enabled: interval !== -1 && client.current !== undefined && resource !== undefined,
		refetchInterval: interval === 0 ? false : (interval as number | false),
	})

	const query = createResourceQuery(
		client,
		'getPose',
		() => [resource, parent() ?? 'world', []] as [ResourceName, string, []],
		() => options
	)

	// const options = $derived(
	// 	queryOptions({
	// 		enabled: interval !== -1 && client.current !== undefined && resource !== undefined,
	// 		refetchInterval: interval === 0 ? false : interval,
	// 		queryKey: [
	// 			'partID',
	// 			partID.current,
	// 			client.current?.name,
	// 			'getPose',
	// 			resource?.name,
	// 			parent(),
	// 		],
	// 		queryFn: async () => {
	// 			if (!client.current || !resource) {
	// 				throw new Error('No client')
	// 			}

	// 			const pose = await client.current.getPose(resource, parent() ?? 'world', [])

	// 			return pose
	// 		},
	// 	})
	// )

	// const query = fromStore(createQuery(toStore(() => options)))

	return {
		get current() {
			if (resource?.subtype === 'arm') {
				return
			}
			return query.current.data?.pose
		},
	}
}
