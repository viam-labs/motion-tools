import { derived, type Readable } from 'svelte/store'

import type { Resource, RobotClient } from '@viamrobotics/sdk'

import { type PartID, useRobotClient } from './robot.svelte'

export type Client<T> = new (part: RobotClient, name: string) => T

export interface ResourceEntity<T extends Resource> {
	name: string
	resource: T | undefined
	partID: PartID
}

export const createResourceEntity = <T extends Resource>(
	partID: { current: string },
	resourceName: string,
	client: Client<T>
) => {
	const { client: robotClient } = useRobotClient(partID)

	const entity: Readable<ResourceEntity<T>> = derived(robotClient, ($robotClient) => {
		return {
			resource: $robotClient
				? // eslint-disable-next-line new-cap
					new client($robotClient, resourceName)
				: undefined,
			name: resourceName,
			partID,
		}
	})

	return entity
}
