import { derived, type Readable } from 'svelte/store'
import { createQuery, type CreateQueryResult } from '@tanstack/svelte-query'

import type { ResourceName } from '@viamrobotics/sdk'

import { assertExists } from '$lib/modules/assert'

import { type PartID, useRobotClient } from '../client/robot'

/**
 * Retrieve a list of all resources for a Part
 */
export const createResourceNamesQuery = (
	partID: Readable<PartID>,
	refetchInterval: number
): CreateQueryResult<ResourceName[]> => {
	const { client: robotClient } = useRobotClient(partID)

	const queryOptions = derived([robotClient, partID], ([$robotClient, $partID]) => ({
		queryKey: ['part', $partID, 'client', $robotClient, 'resourceNames'],
		enabled: $robotClient !== undefined,
		refetchInterval,
		queryFn: async () => {
			assertExists($robotClient, 'Missing resource client on entity')

			return $robotClient.resourceNames()
		},
	}))

	return createQuery(queryOptions)
}
