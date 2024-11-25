import { derived } from 'svelte/store';
import {
  createQuery,
  type CreateQueryResult,
  queryOptions as createQueryOptions,
} from '@tanstack/svelte-query';

import type { ResourceName } from '@viamrobotics/sdk';

import { assertExists } from '$lib/assert';

import { type PartID, useRobotClient } from '../client/robot';

/**
 * Retrieve a list of all resources for a Part
 */
export const createResourceNamesQuery = (
  partID: PartID,
  refetchInterval = 1000
): CreateQueryResult<ResourceName[]> => {
  const { client: robotClient } = useRobotClient(partID);

  const queryOptions = derived(robotClient, ($robotClient) =>
    createQueryOptions({
      queryKey: ['part', partID, 'resourceNames'],
      enabled: $robotClient !== undefined,
      refetchInterval,
      queryFn: async () => {
        assertExists($robotClient, 'Missing resource client on entity');

        return $robotClient.resourceNames();
      },
    })
  );

  return createQuery(queryOptions);
};
