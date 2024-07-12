import { derived, type Readable } from 'svelte/store';

import type { Resource, RobotClient } from '@viamrobotics/sdk';

import { type PartID, useRobotClient } from '../client/robot';

export interface ResourceEntity<T extends Resource> {
  partID: PartID;
  name: string;
  resource: T | undefined;
}

export const createResourceEntity = <T extends Resource>(
  partID: Readable<PartID>,
  resourceName: Readable<string>,
  clientClass: new (part: RobotClient, name: string) => T
): Readable<ResourceEntity<T>> => {
  const { client: robotClient } = useRobotClient(partID);
  return derived(
    [robotClient, partID, resourceName],
    ([$robotClient, $partID, $resourceName]) => ({
      partID: $partID,
      name: $resourceName,
      resource: $robotClient
        ? // eslint-disable-next-line new-cap
          new clientClass($robotClient, $resourceName)
        : undefined,
    })
  );
};
