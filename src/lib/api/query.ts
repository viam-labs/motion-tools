import { derived, type Readable } from 'svelte/store';
import {
  createQuery,
  type CreateQueryResult,
  queryOptions as createQueryOptions,
} from '@tanstack/svelte-query';

import type { Resource } from '@viamrobotics/sdk';

import { assertExists } from '../assert';
import type { ResourceEntity } from '../client';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type ArgumentsType<T> = T extends (...args: infer U) => any ? U : never;

export type ResolvedReturnType<T> = T extends (
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ...args: any[]
) => Promise<infer R>
  ? R
  : never;

export interface ResourceQueryOptions {
  // enabled defaults to true if unspecified
  enabled?: boolean;
  refetchInterval: number | false;
  refetchIntervalInBackground?: boolean;
}

// createResourceQuery wraps `clientClass.func(args)` in a @tanstack query
// This is useful for wrapping the typescript SDK's client wrappers in queries
// Example usage:
//
// const frame = createResourceQuery(
//      options,
//      createResourceEnity(...),
//      'renderFrame',
//      readable<[mimeType?: MimeType]>('image/jpeg' as MimeType)
// )
export const createResourceQuery = <T extends Resource, K extends keyof T>(
  options: Readable<ResourceQueryOptions>,
  entity: Readable<ResourceEntity<T>>,
  func: K,
  args: Readable<ArgumentsType<T[K]>>
): CreateQueryResult<ResolvedReturnType<T[K]>> => {
  const queryOptions = derived(
    [options, entity, args],
    ([$options, $entity, $args]) =>
      createQueryOptions({
        queryKey: [...createResourceQueryKey($entity, func), $args],
        enabled: $entity.resource !== undefined && $options.enabled !== false,
        retry: false,
        queryFn: async () => {
          assertExists($entity.resource, 'Missing resource client on entity');
          const clientFunc = $entity.resource[func];
          if (typeof clientFunc !== 'function') {
            throw new TypeError(
              `${String(func)} is not a function on the resource client.`
            );
          }
          // Call entity.resource.func(args).
          return clientFunc.apply($entity.resource, $args) as Promise<
            ResolvedReturnType<T[K]>
          >;
        },
        ...$options,
      })
  );

  return createQuery(queryOptions);
};

export const createResourceQueryKey = <T extends Resource>(
  entity: ResourceEntity<T>,
  func: keyof T
) => ['part', entity.partID, 'resource', entity.name, String(func)];
