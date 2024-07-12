import { derived, type Readable } from 'svelte/store'
import { createMutation } from '@tanstack/svelte-query'

import type { Resource } from '@viamrobotics/sdk'

import { assertExists } from '$lib/modules/assert'

import { type ResourceEntity } from '../client'
import type { ArgumentsType, ResolvedReturnType } from './query'

export const createResourceMutation = <T extends Resource, K extends keyof T>(
	entity: Readable<ResourceEntity<T>>,
	func: K
) => {
	const mutationOptions = derived(entity, ($entity) => ({
		mutationFn: async (request: ArgumentsType<T[K]>): Promise<ResolvedReturnType<T[K]>> => {
			assertExists($entity.resource, 'Missing resource client on entity')
			const clientFunc = $entity.resource[func]
			if (typeof clientFunc !== 'function') {
				throw new TypeError(`${String(func)} is not a function on the resource client.`)
			}
			// Call entity.resource.func(request).
			return clientFunc.apply($entity.resource, request) as Promise<ResolvedReturnType<T[K]>>
		},
	}))

	return createMutation(mutationOptions)
}
