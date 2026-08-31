import type { Entity } from 'koota'

import { CameraClient } from '@viamrobotics/sdk'
import {
	createResourceClient,
	createResourceQuery,
	useResourceNames,
} from '@viamrobotics/svelte-sdk'
import { getContext, setContext, untrack } from 'svelte'

import { createBufferGeometry, updateBufferGeometry } from '$lib/attribute'
import { ColorFormat } from '$lib/buf/draw/v1/metadata_pb'
import { RefetchRates } from '$lib/components/overlay/refetchRates'
import { hierarchy, setOrAddTrait, traits, useWorld } from '$lib/ecs'
import { parsePcdInWorker } from '$lib/loaders/pcd'
import { useLogs } from '$lib/plugins/Logs/useLogs.svelte'
import { attachPointsBvh } from '$lib/three/pointsBvh'

import { RefreshRates, useSettings } from './useSettings.svelte'

const key = Symbol('pointcloud-context')

interface Context {
	refetch: () => void
}

export const providePointclouds = (partID: () => string) => {
	const world = useWorld()
	const logs = useLogs()
	const settings = useSettings()
	const { refreshRates, disabledCameras } = $derived(settings.current)
	const cameras = useResourceNames(partID, 'camera')

	const clients = $derived(
		cameras.current.map((camera) => createResourceClient(CameraClient, partID, () => camera.name))
	)

	const propQueries = $derived(
		clients.map(
			(client) =>
				[
					client.name,
					createResourceQuery(client, 'getProperties', {
						staleTime: Infinity,
						refetchOnMount: false,
						refetchInterval: false,
					}),
				] as const
		)
	)

	const fetchedPropQueries = $derived(propQueries.every(([, query]) => query.isPending === false))

	const interval = $derived(refreshRates[RefreshRates.pointclouds])
	const enabledClients = $derived(
		clients.filter(
			(client) =>
				fetchedPropQueries && interval !== RefetchRates.OFF && disabledCameras[client.name] !== true
		)
	)

	/**
	 * Some machines have a lot of cameras, so before enabling all of them
	 * we'll first check pointcloud support.
	 *
	 * We'll disable cameras that don't support pointclouds,
	 * but still allow users to manually enable if they want to.
	 */
	$effect(() => {
		for (const [name, query] of propQueries) {
			if (name && query.data?.supportsPcd === false && disabledCameras[name] === undefined) {
				disabledCameras[name] = true
			}
		}
	})

	const options = $derived({
		enabled: interval !== RefetchRates.OFF,
		refetchInterval: interval === RefetchRates.MANUAL ? (false as const) : interval,
	})

	const queries = $derived(
		enabledClients.map(
			(client) =>
				[client.name, createResourceQuery(client, 'getPointCloud', () => options)] as const
		)
	)

	$effect(() => {
		for (const [name, query] of queries) {
			untrack(() => {
				$effect(() => {
					if (query.isFetching) {
						logs.add(`Fetching pointcloud for ${name}...`, 'info', {
							resource: name,
							folder: 'pointclouds',
						})
					} else if (query.error) {
						logs.add(`Error fetching pointcloud from ${name}: ${query.error.message}`, 'error', {
							resource: name,
							folder: 'pointclouds',
						})
					}
				})
			})
		}
	})

	const entities = new Map<string, Entity>()

	$effect(() => {
		const currentPartID = partID()
		const activeQueryKeys = new Set<string>()

		for (const [name, query] of queries) {
			const queryKey = `${currentPartID}:${name}`
			activeQueryKeys.add(queryKey)

			$effect(() => {
				const { data } = query

				let disposed = false

				const destroyEntity = () => {
					const entity = entities.get(queryKey)
					if (entity) {
						if (world.has(entity)) entity.destroy()
						entities.delete(queryKey)
					}
				}

				// No answer yet, which is not the same as a camera answering with no
				// points. A pending or re-keyed query must leave the drawn cloud alone.
				if (data === undefined) {
					return () => {
						disposed = true
					}
				}

				if (data.length === 0) {
					destroyEntity()

					return () => {
						disposed = true
					}
				}

				parsePcdInWorker(data, settings.current.pointBudget)
					.then(({ boundsTree, positions, colors, bounds, shuffled }) => {
						if (disposed) {
							return
						}

						const existing = entities.get(queryKey)
						const metadata = {
							colors,
							colorFormat: ColorFormat.RGB,
						}

						if (existing) {
							hierarchy.setParent(existing, name)
							const geometry = existing.get(traits.BufferGeometry)

							if (geometry) {
								updateBufferGeometry(geometry, positions, metadata, bounds)
								// Replaces the tree built for the points this refresh just overwrote.
								if (boundsTree) attachPointsBvh(geometry, boundsTree)
								setOrAddTrait(existing, traits.PointSampling, {
									total: positions.length / 3,
									shuffled,
								})
								return
							}
						}

						const geometry = createBufferGeometry(positions, metadata, bounds)
						if (boundsTree) attachPointsBvh(geometry, boundsTree)

						const entity = world.spawn(
							...hierarchy.parentTraits(name),
							traits.Name(`${name} pointcloud`),
							traits.BufferGeometry(geometry),
							traits.Points,
							traits.PointSampling({ total: positions.length / 3, shuffled }),
							traits.PointCloudAPI
						)

						entities.set(queryKey, entity)
					})
					.catch((error) => {
						if (disposed) {
							return
						}

						logs.add(error?.reason ?? error?.message ?? 'Failed to parse pointcloud', 'error', {
							resource: name,
							folder: 'pointclouds',
						})
					})

				return () => {
					disposed = true
				}
			})
		}

		// Clean up queries that disappeared entirely.
		for (const [queryKey, entity] of entities) {
			if (!activeQueryKeys.has(queryKey)) {
				if (world.has(entity)) {
					entity.destroy()
				}
				entities.delete(queryKey)
			}
		}
	})

	$effect(() => {
		return () => {
			for (const [, entity] of entities) {
				entity.destroy()
			}

			entities.clear()
		}
	})

	setContext<Context>(key, {
		refetch() {
			for (const [, query] of queries) {
				query.refetch()
			}
		},
	})
}

export const usePointClouds = () => {
	return getContext<Context>(key)
}
