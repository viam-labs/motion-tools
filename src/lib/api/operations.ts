import { derived } from 'svelte/store';
import {
  createMutation,
  createQuery,
  type CreateQueryResult,
  type MutationOptions,
} from '@tanstack/svelte-query';

import type { robotApi } from '@viamrobotics/sdk';

import { assertExists } from '../assert';
import {
  ClientNotConnectedError,
  type PartID,
  useRobotClient,
} from '../client/robot';

/**
 * Retrieve the part's current operations (along with the rtt of this api)
 */
export const createGetOperationsQuery = (
  partID: PartID,
  refetchInterval = 1000
): CreateQueryResult<{ operations: robotApi.Operation[]; rtt: number }> => {
  const { client: robotClient } = useRobotClient(partID);

  const queryOptions = derived(robotClient, ($robotClient) => ({
    queryKey: ['part', partID, 'getOperations'],
    enabled: $robotClient !== undefined,
    refetchInterval,
    queryFn: async () => {
      assertExists($robotClient, 'Missing resource client on entity');

      const start = Date.now();
      const operations = await $robotClient.getOperations();
      const rtt = Date.now() - start;
      return { operations, rtt };
    },
  }));

  return createQuery(queryOptions);
};

export const createCancelOperationMutation = (partID: PartID) => {
  const { client } = useRobotClient(partID);
  const mutationOptions = derived(
    client,
    ($client) =>
      ({
        mutationKey: ['part', partID, 'stopAll'],
        mutationFn: async (id: string): Promise<void> => {
          if ($client === undefined) {
            throw new ClientNotConnectedError(
              'Missing robot client when calling stopAll'
            );
          }
          await $client.cancelOperation(id);
        },
      }) satisfies MutationOptions<void, Error, string>
  );

  return createMutation(mutationOptions);
};
