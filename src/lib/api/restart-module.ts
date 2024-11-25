import { derived } from 'svelte/store';
import { createMutation, type MutationOptions } from '@tanstack/svelte-query';

import {
  ClientNotConnectedError,
  type PartID,
  useRobotClient,
} from '../client/robot';

/** Function signature for a GRPC call to update registry item, with success/error options */
interface RestartModuleRequest {
  moduleID?: string;
  moduleName?: string;
}

/**
 * Retrieve a list of all resources for a Part
 */
export const createRestartModuleMutation = (partID: PartID) => {
  const { client } = useRobotClient(partID);

  const mutationOptions = derived(
    client,
    ($client) =>
      ({
        mutationKey: ['part', partID, 'restartModule'],
        mutationFn: async (variables) => {
          if ($client === undefined) {
            throw new ClientNotConnectedError(
              'Unable to connect to part. Ensure the part is online and try again.'
            );
          }

          await $client.restartModule(variables.moduleID, variables.moduleName);
        },
      }) satisfies MutationOptions<void, Error, RestartModuleRequest>
  );

  return createMutation(mutationOptions);
};
