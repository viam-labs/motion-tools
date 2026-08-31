import type { Entity } from 'koota'

import { useThrelte } from '@threlte/core'
import {
	Struct,
	type TransformChangeEvent,
	TransformChangeType,
	type TransformWithUUID,
	WorldStateStoreClient,
} from '@viamrobotics/sdk'
import {
	createResourceClient,
	createResourceQuery,
	type ResourceClientContext,
	useResourceNames,
} from '@viamrobotics/svelte-sdk'
import { untrack } from 'svelte'

import { asFloat32Array, inMeters } from '$lib/buffer'
import { createChunkLoader, type EntityChunk } from '$lib/chunking'
import { drawTransform, updateMetadata } from '$lib/draw'
import { hierarchy, traits, useWorld } from '$lib/ecs'
import { isPointCloud } from '$lib/geometry'
import { Pose } from '$lib/math'
import { metadataFromStruct } from '$lib/metadata'

import { usePartID } from './usePartID.svelte'
import { useRelationships } from './useRelationships.svelte'

type TransformEvent = TransformChangeEvent & {
	transform: TransformWithUUID
}

export const provideWorldStates = () => {
	const partID = usePartID()
	const resourceNames = useResourceNames(() => partID.current, 'world_state_store')
	const clients = $derived(
		resourceNames.current.map(({ name }) =>
			createResourceClient(
				WorldStateStoreClient,
				() => partID.current,
				() => name
			)
		)
	)

	$effect(() => {
		const activeClients = clients

		// Untracked: `createResourceQuery` reads `client.current` while it builds its
		// observer, so tracking the setup would re-run this effect on every
		// connection change and the cleanup below would destroy every entity.
		const cleanups = untrack(() => activeClients.map((client) => createWorldState(client)))

		return () => {
			for (const cleanup of cleanups) {
				cleanup()
			}
		}
	})
}

// FieldMask paths are proto field names; spec-compliant backends emit
// snake_case (`pose_in_observer_frame`) while some emit camelCase. Normalize
// to camelCase so matching against the message's accessors is casing-agnostic.
const snakeToCamel = (path: string): string =>
	path.replaceAll(/_([a-z])/g, (_, char: string) => char.toUpperCase())

const decodeBase64 = (encoded: string): Uint8Array => {
	const binary = atob(encoded)
	const bytes = new Uint8Array(binary.length)
	for (let i = 0; i < binary.length; i++) {
		bytes[i] = binary.charCodeAt(i)
	}
	return bytes
}

/**
 * Unpacks a `get_entity_chunk` DoCommand response into the shape the shared
 * chunk loader expects. The world-state store sends binary buffers as base64
 * strings inside a JSON `Struct`, which is why this adapter exists.
 *
 * Request:
 *   { "command": "get_entity_chunk", "uuid": "<uuid-string>", "start": <element-offset> }
 *
 * Response:
 *   {
 *     "entity": {
 *       "metadata": {
 *         "colors":    "<base64 Uint8Array>" (optional),
 *         "opacities": "<base64 Uint8Array>" (optional)
 *       },
 *       "physical_object": {
 *         "points": { "positions": "<base64 Float32Array>" }
 *       }
 *     },
 *     "start": <number>,
 *     "done":  <boolean>
 *   }
 */
const decodeWorldStateChunk = (response: unknown, fallbackStart: number): EntityChunk | null => {
	const fields = response as Record<string, unknown>
	const done = fields['done'] === true
	const start = typeof fields['start'] === 'number' ? fields['start'] : fallbackStart

	const chunkEntity = fields['entity'] as Record<string, unknown> | undefined
	if (!chunkEntity) return null

	const physicalObject = chunkEntity['physical_object'] as Record<string, unknown> | undefined
	const points = physicalObject?.['points'] as Record<string, unknown> | undefined
	const encodedPositions = points?.['positions']
	if (typeof encodedPositions !== 'string' || encodedPositions.length === 0) return null

	const positions = asFloat32Array(decodeBase64(encodedPositions), inMeters)

	const metadata = chunkEntity['metadata'] as Record<string, unknown> | undefined
	const encodedColors = metadata?.['colors']
	const colors =
		typeof encodedColors === 'string' && encodedColors.length > 0
			? decodeBase64(encodedColors)
			: undefined

	const encodedOpacities = metadata?.['opacities']
	const opacities =
		typeof encodedOpacities === 'string' && encodedOpacities.length > 0
			? decodeBase64(encodedOpacities)
			: undefined

	return { start, positions, colors, opacities, done }
}

const createWorldState = (client: ResourceClientContext<WorldStateStoreClient>) => {
	const { invalidate } = useThrelte()
	const world = useWorld()
	const relationships = useRelationships()

	const entities = new Map<string, Entity>()
	// UUIDs the stream has removed; guards against a stale initial snapshot or a
	// self-heal fetch re-creating an entity the server has already deleted.
	const removedUUIDs = new Set<string>()
	// UUIDs with an in-flight self-heal `getTransform`, to dedupe concurrent fetches.
	const pendingSpawns = new Set<string>()

	const chunkLoader = createChunkLoader({
		world,
		invalidate,
		fetchChunk: async (uuid, start, signal) => {
			const activeClient = client.current
			if (!activeClient) return null

			const response = await activeClient.doCommand(
				Struct.fromJson({
					command: 'get_entity_chunk',
					uuid,
					start,
				})
			)

			if (signal.aborted) return null

			return decodeWorldStateChunk(response, start)
		},
	})

	const spawnEntity = (transform: TransformWithUUID) => {
		if (entities.has(transform.uuidString) || removedUUIDs.has(transform.uuidString)) {
			return
		}

		const spawned = drawTransform(world, transform, traits.WorldStateStoreAPI, { removable: false })
		entities.set(transform.uuidString, spawned.entity)
		relationships.apply(spawned.entity, spawned.relationships)

		const parsedMetadata = metadataFromStruct(transform.metadata?.fields)
		chunkLoader.start(transform.uuidString, spawned.entity, parsedMetadata)
		relationships.flush(transform.uuidString)

		if (isPointCloud(transform.physicalObject?.geometryType)) invalidate()
	}

	const destroyEntity = (uuid: string) => {
		removedUUIDs.add(uuid)

		const entity = entities.get(uuid)

		if (!entity) return

		if (world.has(entity)) {
			entity.destroy()
		}
		entities.delete(uuid)
	}

	// Spawn an entity whose UPDATE delta arrived before the initial snapshot
	// created it. The delta carries only changed fields, so fetch the full
	// transform; skip if it was removed or already spawned meanwhile.
	const spawnFromServer = async (uuid: string) => {
		if (entities.has(uuid) || removedUUIDs.has(uuid) || pendingSpawns.has(uuid)) return

		pendingSpawns.add(uuid)
		try {
			const transform = await client.current?.getTransform(uuid)
			if (transform && !removedUUIDs.has(uuid)) {
				spawnEntity(transform)
				invalidate()
			}
		} catch (error) {
			console.error('World state self-heal failed for', uuid, error)
		} finally {
			pendingSpawns.delete(uuid)
		}
	}

	const updateEntity = (transform: TransformWithUUID, changes: (string | number)[]) => {
		const entity = entities.get(transform.uuidString)

		if (!entity) {
			void spawnFromServer(transform.uuidString)
			return
		}

		let metadataDirty = false

		for (const rawPath of changes) {
			if (typeof rawPath !== 'string') continue

			const path = snakeToCamel(rawPath)

			if (path.startsWith('poseInObserverFrame')) {
				const matrix = entity.get(traits.Matrix)
				if (matrix) {
					new Pose().copy(transform.poseInObserverFrame?.pose).toMatrix4(matrix)
					entity.changed(traits.Matrix)
				} else {
					entity.add(
						traits.Matrix(new Pose().copy(transform.poseInObserverFrame?.pose).toMatrix4())
					)
				}
				hierarchy.setParent(entity, transform.poseInObserverFrame?.referenceFrame)
			} else if (path.startsWith('physicalObject') && transform.physicalObject) {
				traits.updateGeometryTrait(entity, transform.physicalObject)
			} else if (path.startsWith('metadata')) {
				metadataDirty = true
			}
		}

		if (metadataDirty) {
			const parsedMetadata = metadataFromStruct(transform.metadata?.fields)
			updateMetadata(entity, parsedMetadata, {
				pointCloud: isPointCloud(transform.physicalObject?.geometryType),
			})
			relationships.apply(entity, parsedMetadata.relationships)
		}
	}

	let initialized = false
	let flushScheduled = false
	let rafId = 0
	let pendingEvents: TransformEvent[] = []

	const listUUIDs = createResourceQuery(client, 'listUUIDs')
	const getTransformQueries = $derived(
		listUUIDs.data?.map((uuid) => {
			return createResourceQuery(
				client,
				'getTransform',
				() => [uuid] as const,
				() => ({ refetchInterval: false })
			)
		})
	)

	const applyEvents = (events: TransformEvent[]) => {
		for (const event of events) {
			if (event.changeType === TransformChangeType.ADDED) {
				removedUUIDs.delete(event.transform.uuidString)
				spawnEntity(event.transform)
			} else if (event.changeType === TransformChangeType.REMOVED) {
				destroyEntity(event.transform.uuidString)
			} else if (event.changeType === TransformChangeType.UPDATED) {
				updateEntity(event.transform, event.updatedFields?.paths ?? [])
			} else {
				console.error('Unspecified change type.', event)
			}
		}

		invalidate()
	}

	const scheduleFlush = () => {
		if (flushScheduled) return
		flushScheduled = true

		rafId = requestAnimationFrame(() => {
			rafId = 0
			flushScheduled = false
			const toApply = pendingEvents
			pendingEvents = []
			applyEvents(toApply)
		})
	}

	$effect(() => {
		if (!getTransformQueries) return
		if (initialized) return
		if (getTransformQueries.some((query) => query?.isLoading)) return

		const transforms = getTransformQueries
			.flatMap((query) => query?.data)
			.filter((transform) => transform !== undefined)

		for (const transform of transforms) {
			spawnEntity(transform)
		}

		invalidate()
		initialized = true
	})

	/**
	 * Consumes the `streamTransformChanges` server stream directly.
	 * Transform changes are write-once into the ECS world, so we drain
	 * each event into `pendingEvents` (cleared every flush) and never
	 * retain history. Mirrors `useDrawService`'s stream consumption.
	 */
	const consumeChanges = async (signal: AbortSignal) => {
		const activeClient = client.current
		if (!activeClient) return

		try {
			for await (const event of activeClient.streamTransformChanges(undefined, { signal })) {
				if (signal.aborted) break
				if (!event.transform) continue

				pendingEvents.push(event as TransformEvent)
				scheduleFlush()
			}
		} catch (error) {
			if (!signal.aborted) {
				console.error('World state transform stream error:', error)
			}
		}
	}

	$effect(() => {
		if (!client.current) return

		const controller = new AbortController()

		// The entities survived the disconnect, so any pull that ran out of client
		// mid-stream still owes its point cloud the rest of its chunks.
		chunkLoader.resume()
		void consumeChanges(controller.signal)

		return () => {
			controller.abort()
		}
	})

	return () => {
		if (rafId) cancelAnimationFrame(rafId)
		pendingEvents = []
		chunkLoader.dispose()
		for (const [, entity] of entities) {
			if (world.has(entity)) {
				entity.destroy()
			}
		}
	}
}
