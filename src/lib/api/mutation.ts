import { derived, type Readable } from 'svelte/store';
import { createMutation, type MutationOptions } from '@tanstack/svelte-query';

import type { Resource } from '@viamrobotics/sdk';

import { assertExists } from '$lib/assert';

import type { ResourceEntity } from '../client';
import type { ArgumentsType, ResolvedReturnType } from './query';

export const createResourceMutation = <T extends Resource, K extends keyof T>(
  entity: Readable<ResourceEntity<T>>,
  func: K
) => {
  type MutArgs = ArgumentsType<T[K]>;
  type MutReturn = ResolvedReturnType<T[K]>;

  const mutationOptions = derived(
    entity,
    ($entity) =>
      ({
        mutationKey: createResourceMutationKey($entity, func),
        mutationFn: async (request) => {
          assertExists($entity.resource, 'Missing resource client on entity');
          const clientFunc = $entity.resource[func];
          if (typeof clientFunc !== 'function') {
            throw new TypeError(
              `${String(func)} is not a function on the resource client.`
            );
          }
          // Call entity.resource.func(request).
          return clientFunc.apply(
            $entity.resource,
            request
          ) as Promise<MutReturn>;
        },
      }) satisfies MutationOptions<MutReturn, Error, MutArgs>
  );

  return createMutation(mutationOptions);
};
export const createResourceMutationKey = <T extends Resource>(
  entity: ResourceEntity<T>,
  func: keyof T
) => ['part', entity.partID, 'resource', entity.name, String(func)];
