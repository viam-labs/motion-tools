import type { ConfigurableTrait, Entity } from 'koota'

import { VisionClient } from '@viamrobotics/sdk'
import {
	createResourceClient,
	createResourceQuery,
	useResourceNames,
} from '@viamrobotics/svelte-sdk'
import { getContext, setContext, untrack } from 'svelte'
import { Matrix4 } from 'three'

import { createBufferGeometry, updateBufferGeometry } from '$lib/attribute'
import { ColorFormat } from '$lib/buf/draw/v1/metadata_pb'
import { RefetchRates } from '$lib/components/overlay/refetchRates'
import { hierarchy, setOrAddTrait, traits, useWorld } from '$lib/ecs'
import { parsePcdInWorker } from '$lib/loaders/pcd'
import { Pose } from '$lib/math'
import { useLogs } from '$lib/plugins/Logs/useLogs.svelte'
import { attachPointsBvh } from '$lib/three/pointsBvh'

import { RefreshRates, useSettings } from './useSettings.svelte'

const key = Symbol('pointcloud-object-context')

interface Context {
	refetch: () => void
}

const matrix4 = new Matrix4()

export const providePointcloudObjects = (partID: () => string) => {
	const world = useWorld()
	const settings = useSettings()
	const { refreshRates, disabledVisionServices } = $derived(settings.current)
	const services = useResourceNames(partID, 'vision')

	const clients = $derived(
		services.current.map((service) =>
			createResourceClient(VisionClient, partID, () => service.name)
		)
	)

	const propQueries = $derived(
		clients.map(
			(client) =>
				[
					client.current?.name,
					createResourceQuery(client, 'getProperties', {
						staleTime: Infinity,
						refetchOnMount: false,
						refetchInterval: false,
					}),
				] as const
		)
	)

	const fetchedPropQueries = $derived(propQueries.every(([, query]) => query.isPending === false))

	const enabledClients = $derived.by(() => {
		const results = []

		for (const client of clients) {
			if (
				fetchedPropQueries &&
				client.current?.name &&
				interval !== RefetchRates.OFF &&
				disabledVisionServices[client.current?.name] !== true
			) {
				results.push(client as { current: VisionClient })
			}
		}

		return results
	})

	/**
	 * Some machines have a lot of vision services, so before enabling all of them
	 * we'll first check pointcloud object support.
	 *
	 * We'll disable cameras that don't support pointclouds,
	 * but still allow users to manually enable if they want to.
	 */
	$effect(() => {
		for (const [name, query] of propQueries) {
			if (
				name &&
				query.data?.objectPointCloudsSupported === false &&
				disabledVisionServices[name] === undefined
			) {
				disabledVisionServices[name] = true
			}
		}
	})

	const logs = useLogs()
	const interval = $derived(refreshRates[RefreshRates.vision])

	const options = $derived({
		enabled: interval !== RefetchRates.OFF,
		refetchInterval: (interval === RefetchRates.MANUAL ? false : interval) as number | false,
	})

	const queries = $derived(
		enabledClients.map(
			(client) =>
				[
					client.current.name,
					createResourceQuery(client, 'getObjectPointClouds', [''], () => options),
				] as const
		)
	)

	$effect(() => {
		for (const [name, query] of queries) {
			untrack(() => {
				$effect(() => {
					if (query.isFetching) {
						logs.add(`Fetching pointcloud for ${name}...`, 'info', {
							resource: name,
							folder: 'pointcloud-objects',
						})
					} else if (query.error) {
						logs.add(`Error fetching pointcloud from ${name}: ${query.error.message}`, 'error', {
							resource: name,
							folder: 'pointcloud-objects',
						})
					}
				})
			})
		}
	})

	const entities = new Map<string, Entity>()
	const queryEntityKeys = new Map<string, Set<string>>()

	const destroyEntity = (key: string) => {
		const entity = entities.get(key)
		if (entity) {
			if (world.has(entity)) entity.destroy()
			entities.delete(key)
		}
	}

	$effect(() => {
		const currentPartID = partID()
		const activeQueryKeys = new Set<string>()

		for (const [name, query] of queries) {
			const queryKey = `${currentPartID}:${name}`
			activeQueryKeys.add(queryKey)

			$effect(() => {
				const { data } = query

				let disposed = false
				const nextKeys = new Set<string>()

				const reconcileRemovedKeys = () => {
					const prevKeys = queryEntityKeys.get(queryKey) ?? new Set<string>()

					for (const key of prevKeys) {
						if (!nextKeys.has(key)) {
							destroyEntity(key)
						}
					}

					queryEntityKeys.set(queryKey, new Set(nextKeys))
				}

				if (!data || data.length === 0) {
					reconcileRemovedKeys()

					return () => {
						disposed = true
					}
				}

				let index = 0

				for (const { geometries: geometriesInFrame, pointCloud } of data) {
					if (pointCloud.length > 0) {
						const pointcloudLabel = `${name} pointcloud ${index + 1}`
						nextKeys.add(pointcloudLabel)

						parsePcdInWorker(pointCloud, settings.current.pointBudget)
							.then(({ boundsTree, positions, colors, bounds, shuffled }) => {
								if (disposed) {
									return
								}

								if (!nextKeys.has(pointcloudLabel)) {
									return
								}

								const existing = entities.get(pointcloudLabel)
								const metadata = {
									colors,
									colorFormat: ColorFormat.RGB,
								}

								if (existing) {
									const geometry = existing.get(traits.BufferGeometry)

									if (geometry) {
										updateBufferGeometry(geometry, positions, metadata, bounds)
										// Replaces the tree built for the points this refresh just overwrote.
										if (boundsTree) attachPointsBvh(geometry, boundsTree)
										setOrAddTrait(existing, traits.PointSampling, {
											total: positions.length / 3,
											shuffled,
										})
									}
								} else {
									const geometry = createBufferGeometry(positions, metadata, bounds)
									if (boundsTree) attachPointsBvh(geometry, boundsTree)

									const entity = world.spawn(
										traits.Name(pointcloudLabel),
										traits.BufferGeometry(geometry),
										traits.Points,
										traits.PointSampling({ total: positions.length / 3, shuffled }),
										traits.PointCloudObjectAPI
									)

									entities.set(pointcloudLabel, entity)
								}
							})
							.catch((error) => {
								if (disposed) {
									return
								}

								logs.add(error?.reason ?? error?.message ?? 'Failed to parse pointcloud', 'error', {
									resource: name,
									folder: 'pointcloud-objects',
								})
							})
					}

					if (geometriesInFrame) {
						let geometryIndex = 0

						for (const geometry of geometriesInFrame.geometries) {
							const geometryLabel = `${name} pointcloud ${index + 1} geometry ${geometryIndex + 1}`

							nextKeys.add(geometryLabel)

							const center = new Pose().copy(geometry.center)
							const existing = entities.get(geometryLabel)

							if (existing) {
								hierarchy.setParent(existing, geometriesInFrame.referenceFrame)
								center.toMatrix4(matrix4)
								const matrix = existing.get(traits.Matrix)
								if (matrix && !matrix.equals(matrix4)) {
									matrix.copy(matrix4)
									existing.changed(traits.Matrix)
								}
								traits.updateGeometryTrait(existing, geometry)
							} else {
								const entityTraits: ConfigurableTrait[] = [
									traits.Name(geometryLabel),
									...hierarchy.parentTraits(geometriesInFrame.referenceFrame),
									traits.Matrix(center.toMatrix4()),
									traits.Geometry(geometry),
									traits.Opacity(0.2),
									traits.Color({ r: 0, g: 1, b: 0 }),
									traits.PointCloudObjectAPI,
								]

								const entity = world.spawn(...entityTraits)

								entities.set(geometryLabel, entity)
							}

							geometryIndex += 1
						}
					}

					index += 1
				}

				reconcileRemovedKeys()

				return () => {
					disposed = true
				}
			})
		}

		// Clean up queries that disappeared entirely.
		for (const [queryKey, keys] of queryEntityKeys) {
			if (!activeQueryKeys.has(queryKey)) {
				for (const key of keys) {
					destroyEntity(key)
				}
				queryEntityKeys.delete(queryKey)
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

export const usePointcloudObjects = () => {
	return getContext<Context>(key)
}
