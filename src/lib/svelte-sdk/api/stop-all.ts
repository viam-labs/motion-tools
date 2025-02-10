import { derived } from 'svelte/store';
import { createMutation, type MutationOptions } from '@tanstack/svelte-query';

import {
  ClientNotConnectedError,
  type PartID,
  useRobotClient,
} from '../client';

export const createStopAllMutation = (partID: PartID) => {
  const { client } = useRobotClient(partID);
  const mutationOptions = derived(
    client,
    ($client) =>
      ({
        mutationKey: ['part', partID, 'stopAll'],
        mutationFn: async (): Promise<void> => {
          if ($client === undefined) {
            throw new ClientNotConnectedError(
              'Missing robot client when calling stopAll'
            );
          }
          await $client.stopAll();
        },
      }) satisfies MutationOptions
  );

  return createMutation(mutationOptions);
};
