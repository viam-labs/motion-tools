import { derived } from 'svelte/store';
import { createQuery, type CreateQueryResult } from '@tanstack/svelte-query';

import type { robotApi } from '@viamrobotics/sdk';

import { assertExists } from '../assert';
import { type PartID, useRobotClient } from '../client/robot';

/**
 * Retrieve the part's current sessions & the current session's ID
 * (the session ID changes at runtime outside any reactive variables (that I can find))
 */
export const createGetSessionsQuery = (
  partID: PartID,
  refetchInterval = 1000,
  enabled = true
): CreateQueryResult<{
  sessions: robotApi.Session[];
  ourSessionId: string | undefined;
}> => {
  const { client: robotClient } = useRobotClient(partID);
  const queryOptions = derived(robotClient, ($robotClient) => ({
    queryKey: ['part', partID, 'getSessions'],
    enabled: enabled && $robotClient !== undefined,
    refetchInterval,
    queryFn: async () => {
      assertExists($robotClient, 'Missing resource client on entity');
      return {
        sessions: await $robotClient.getSessions(),
        ourSessionId: $robotClient.sessionId,
      };
    },
  }));

  return createQuery(queryOptions);
};
