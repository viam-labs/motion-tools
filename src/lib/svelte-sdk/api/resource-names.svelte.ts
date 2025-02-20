import {
	createQuery,
	type CreateQueryResult,
	queryOptions as createQueryOptions,
} from '@tanstack/svelte-query'

import type { ResourceName } from '@viamrobotics/sdk'

import { assertExists } from '$lib/assert'

import { type PartID, useRobotClient } from '../client/robot.svelte'
import { untrack } from 'svelte'

/**
 * Retrieve a list of all resources for a Part
 */
export const createResourceNamesQuery = (
	partID: { current: PartID },
	refetchInterval = 5_000
): { current: CreateQueryResult<ResourceName[]> } => {
	const robot = useRobotClient(partID)
	const client = $derived(robot.client)

	const query = $derived(
		createQuery(
			createQueryOptions({
				queryKey: ['part', untrack(() => partID.current), 'resourceNames'],
				enabled: client !== undefined,
				refetchInterval,
				queryFn: async () => {
					assertExists(client, 'Missing resource client on entity')
					return client.resourceNames()
				},
			})
		)
	)

	return {
		get current() {
			return query
		},
	}
}
