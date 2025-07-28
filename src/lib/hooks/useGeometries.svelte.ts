import { ArmClient, CameraClient, Geometry, GripperClient } from '@viamrobotics/sdk'
import { createQueries, queryOptions, type CreateQueryOptions } from '@tanstack/svelte-query'
import { createResourceClient, useResourceNames } from '@viamrobotics/svelte-sdk'
import { setContext, getContext } from 'svelte'
import { fromStore, toStore } from 'svelte/store'
import { useMachineSettings } from './useMachineSettings.svelte'
import { WorldObject } from '$lib/WorldObject'
import { usePersistentUUIDs } from './usePersistentUUIDs.svelte'
import { useLogs } from './useLogs.svelte'
import { resourceColors } from '$lib/color'

const key = Symbol('geometries-context')

interface Context {
	current: WorldObject[]
}

export const provideGeometries = (partID: () => string) => {
	const resourceNames = useResourceNames(partID)
	const arms = useResourceNames(partID, 'arm')
	const cameras = useResourceNames(partID, 'camera')
	const grippers = useResourceNames(partID, 'gripper')

	const logs = useLogs()
	const { refreshRates } = useMachineSettings()

	const armClients = $derived(
		arms.current.map((arm) => createResourceClient(ArmClient, partID, () => arm.name))
	)
	const gripperClients = $derived(
		grippers.current.map((gripper) =>
			createResourceClient(GripperClient, partID, () => gripper.name)
		)
	)
	const cameraClients = $derived(
		cameras.current.map((camera) => createResourceClient(CameraClient, partID, () => camera.name))
	)
	const clients = $derived([...armClients, ...gripperClients, ...cameraClients])

	if (!refreshRates.has('Geometries')) {
		refreshRates.set('Geometries', 1000)
	}

	const options = $derived.by(() => {
		const interval = refreshRates.get('Geometries')
		const results: CreateQueryOptions<
			{
				name: string
				geometries: Geometry[]
			},
			Error,
			{
				name: string
				geometries: Geometry[]
			},
			(string | undefined)[]
		>[] = []

		for (const client of clients) {
			const options = queryOptions({
				enabled: interval !== -1 && client.current !== undefined,
				refetchInterval: interval === 0 ? false : interval,
				queryKey: ['partID', partID(), client.current?.name, 'getGeometries'],
				queryFn: async (): Promise<{ name: string; geometries: Geometry[] }> => {
					if (!client.current) {
						throw new Error('No client')
					}

					logs.add(`Fetching geometries for ${client.current.name}...`)
					const geometries = await client.current.getGeometries()
					return { name: client.current.name, geometries }
				},
			})

			results.push(options)
		}

		return results
	})

	const { updateUUIDs } = usePersistentUUIDs()
	const queries = fromStore(createQueries({ queries: toStore(() => options) }))

	const geometries = $derived.by(() => {
		const results: WorldObject[] = []

		for (const query of queries.current) {
			if (!query.data) continue

			for (const { center, label, geometryType } of query.data.geometries) {
				const resourceName = resourceNames.current.find((item) => item.name === query.data.name)
				const worldObject = new WorldObject(
					label ? label : 'Unnamed geometry',
					center,
					query.data.name,
					geometryType,
					resourceName
						? { color: resourceColors[resourceName.subtype as keyof typeof resourceColors] }
						: undefined
				)
				results.push(worldObject)
			}
		}

		updateUUIDs(results)

		return results
	})

	setContext<Context>(key, {
		get current() {
			return geometries
		},
	})
}

export const useGeometries = () => {
	return getContext<Context>(key)
}
