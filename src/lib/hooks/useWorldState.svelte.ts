import type { RobotClient, Transform } from '@viamrobotics/sdk'
import type { Entity } from 'koota'

import { useThrelte } from '@threlte/core'
import { Struct, WorldStateStoreClient } from '@viamrobotics/sdk'
import {
	createResourceClient,
	createResourceQuery,
	type ResourceClientContext,
	useResourceNames,
	useRobotClient,
} from '@viamrobotics/svelte-sdk'
import { untrack } from 'svelte'

import type { BatchChange, BatchMessage } from '$lib/worldstate/workerMessages'

import { Transform as TransformMessage } from '$lib/buf/common/v1/common_pb'
import { TransformChangeType } from '$lib/buf/service/worldstatestore/v1/world_state_store_pb'
import { asFloat32Array, inMeters } from '$lib/buffer'
import { createChunkLoader, type EntityChunk } from '$lib/chunking'
import { drawTransform, updateMetadata } from '$lib/draw'
import { hierarchy, traits, useWorld } from '$lib/ecs'
import { isPointCloud } from '$lib/geometry'
import { Pose } from '$lib/math'
import { metadataFromStruct } from '$lib/metadata'
import { useLogs } from '$lib/plugins/Logs/useLogs.svelte'
import { drainWithBudget } from '$lib/worldstate/budgetedFlush'
import { createFlushScheduler } from '$lib/worldstate/flushScheduler'
import {
	type ApplyOutcome,
	FLUSH_BUDGET_MS,
	FLUSH_MAX_SPAWNS,
	HIDDEN_FLUSH_INTERVAL_MS,
	type TransformField,
} from '$lib/worldstate/pendingTransformChanges'
import { openRawTransformStream } from '$lib/worldstate/rawTransformStream'
import { createTransformDecodeWorker } from '$lib/worldstate/transformDecodeWorker'

import { createStreamStats } from './createStreamStats'
import { usePartID } from './usePartID.svelte'
import { useRelationships } from './useRelationships.svelte'
import {
	provideWorldStateStreamStats,
	type WorldStateStreamStatsRegistry,
} from './worldStateStreamStats'

export const provideWorldStates = () => {
	const partID = usePartID()
	const streamStats = provideWorldStateStreamStats()
	const resourceNames = useResourceNames(() => partID.current, 'world_state_store')
	const robotClient = useRobotClient(() => partID.current)
	const clients = $derived(
		resourceNames.current.map(({ name }) => ({
			name,
			client: createResourceClient(
				WorldStateStoreClient,
				() => partID.current,
				() => name
			),
		}))
	)

	$effect(() => {
		const activeClients = clients

		// Untracked: `createResourceQuery` reads `client.current` while it builds its
		// observer, so tracking the setup would re-run this effect on every
		// connection change and the cleanup below would destroy every entity.
		const cleanups = untrack(() =>
			activeClients.map(({ client, name }) =>
				createWorldState(client, name, streamStats, () => robotClient.current)
			)
		)

		return () => {
			for (const cleanup of cleanups) {
				cleanup()
			}
		}
	})
}

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

const createWorldState = (
	client: ResourceClientContext<WorldStateStoreClient>,
	name: string,
	streamStats: WorldStateStreamStatsRegistry,
	getRobotClient: () => RobotClient | undefined
) => {
	const { invalidate } = useThrelte()
	const world = useWorld()
	const relationships = useRelationships()
	const logs = useLogs()

	const stats = createStreamStats()
	const unregister = streamStats.register(name, stats)

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

	const spawnEntity = (uuid: string, transform: Transform) => {
		if (entities.has(uuid) || removedUUIDs.has(uuid)) {
			return
		}

		const spawned = drawTransform(world, transform, traits.WorldStateStoreAPI, { removable: false })
		entities.set(uuid, spawned.entity)
		relationships.apply(spawned.entity, spawned.relationships)

		const parsedMetadata = metadataFromStruct(transform.metadata?.fields)
		chunkLoader.start(uuid, spawned.entity, parsedMetadata)
		relationships.flush(uuid)

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
				spawnEntity(uuid, transform)
				invalidate()
			}
		} catch (error) {
			logs.add(`World state store: could not fetch transform ${uuid}`, 'error', {
				folder: 'world-state-store',
			})
			console.error('World state self-heal failed for', uuid, error)
		} finally {
			pendingSpawns.delete(uuid)
		}
	}

	// `fields` is `undefined` for full state (an ADDED, a REMOVED-as-update, or an
	// UPDATED whose mask was empty); a set updates only the groups it names.
	const updateEntity = (
		uuid: string,
		transform: TransformMessage,
		fields: Set<TransformField> | undefined
	) => {
		const entity = entities.get(uuid)

		if (!entity) {
			void spawnFromServer(uuid)
			return
		}

		if (fields === undefined || fields.has('poseInObserverFrame')) {
			const matrix = entity.get(traits.Matrix)
			if (matrix) {
				new Pose().copy(transform.poseInObserverFrame?.pose).toMatrix4(matrix)
				entity.changed(traits.Matrix)
			} else {
				entity.add(traits.Matrix(new Pose().copy(transform.poseInObserverFrame?.pose).toMatrix4()))
			}
			hierarchy.setParent(entity, transform.poseInObserverFrame?.referenceFrame)
		}

		if ((fields === undefined || fields.has('physicalObject')) && transform.physicalObject) {
			traits.updateGeometryTrait(entity, transform.physicalObject)
		}

		if (fields === undefined || fields.has('metadata')) {
			const parsedMetadata = metadataFromStruct(transform.metadata?.fields)
			updateMetadata(entity, parsedMetadata, {
				pointCloud: isPointCloud(transform.physicalObject?.geometryType),
			})
			relationships.apply(entity, parsedMetadata.relationships)
		}
	}

	let initialized = false
	const pending = new Map<string, BatchChange>()
	const pendingRaw: Uint8Array[] = []
	let isAwaitingBatch = false
	let hasUnrequestedIngest = false

	// The pending map is always empty when a batch lands: a batch is only requested
	// once main has drained everything it had (see `flush`'s request condition below).
	const onBatch = (batch: BatchMessage) => {
		for (const change of batch.changes) {
			pending.set(change.uuid, change)
		}
		isAwaitingBatch = false
		if (pending.size > 0) scheduler.request()
	}

	const decodeWorker = createTransformDecodeWorker(onBatch)

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

	/**
	 * A server republish of an already-spawned UUID arrives as REMOVED-then-ADDED, but the
	 * store's stable UUID means the same reference frame reappearing is a respawn, not a new
	 * entity: update the existing entity in place instead of paying for a destroy and a spawn.
	 */
	const applyChange = (uuid: string, change: BatchChange): ApplyOutcome => {
		if (change.changeType === TransformChangeType.REMOVED) {
			const existed = entities.has(uuid)
			destroyEntity(uuid)
			return { spawned: existed }
		}

		const transform = TransformMessage.fromBinary(change.transform)
		const fields = change.fields ? new Set<TransformField>(change.fields) : undefined

		switch (change.changeType) {
			case TransformChangeType.ADDED: {
				removedUUIDs.delete(uuid)
				const existing = entities.get(uuid)
				if (existing && existing.get(traits.Name) === transform.referenceFrame) {
					updateEntity(uuid, transform, undefined)
					return { spawned: false }
				}
				if (existing) destroyEntity(uuid)
				spawnEntity(uuid, transform)
				return { spawned: true }
			}
			case TransformChangeType.UPDATED: {
				updateEntity(uuid, transform, fields)
				return { spawned: false }
			}
		}
	}

	const flush = () => {
		const start = performance.now()
		const now = () => performance.now()

		if (pendingRaw.length > 0) {
			decodeWorker.ingest(pendingRaw.splice(0))
			hasUnrequestedIngest = true
		}

		// Only ask the worker for a batch once main has nothing left to apply, so the
		// worker's decode work overlaps with main's drain instead of racing ahead of it.
		if (hasUnrequestedIngest && !isAwaitingBatch && pending.size === 0) {
			decodeWorker.requestBatch()
			isAwaitingBatch = true
			hasUnrequestedIngest = false
		}

		const result = drainWithBudget(pending, applyChange, {
			now,
			budgetMs: FLUSH_BUDGET_MS,
			maxSpawns: FLUSH_MAX_SPAWNS,
		})
		const end = performance.now()

		if (result.applied > 0) invalidate()
		stats.recordFlush({
			start,
			end,
			applied: result.applied,
			backlog: result.remaining + pendingRaw.length,
		})
		if (result.remaining > 0 || pendingRaw.length > 0) scheduler.request()
	}

	const scheduler = createFlushScheduler({
		flush,
		isVisible: () => document.visibilityState === 'visible',
		requestFrame: (callback) => requestAnimationFrame(callback),
		cancelFrame: (handle) => cancelAnimationFrame(handle),
		setTimer: (callback, ms) => window.setTimeout(callback, ms),
		clearTimer: (handle) => window.clearTimeout(handle),
		hiddenIntervalMs: HIDDEN_FLUSH_INTERVAL_MS,
	})

	$effect(() => {
		if (!getTransformQueries) return
		if (initialized) return
		if (getTransformQueries.some((query) => query?.isLoading)) return

		const transforms = getTransformQueries
			.flatMap((query) => query?.data)
			.filter((transform) => transform !== undefined)

		for (const transform of transforms) {
			spawnEntity(transform.uuidString, transform)
		}

		invalidate()
		initialized = true
	})

	/**
	 * Consumes the `StreamTransformChanges` RPC as raw response bytes: the receive loop never
	 * decodes, it only queues the buffer the transport hands back untouched (the service
	 * descriptor's output type is a pass-through) and wakes the flush, which decodes under
	 * its own budget.
	 */
	const consumeRawChanges = async (robotClient: RobotClient, signal: AbortSignal) => {
		try {
			for await (const { bytes } of openRawTransformStream(robotClient, name, signal)) {
				if (signal.aborted) break

				pendingRaw.push(bytes)
				stats.recordIngest(1, bytes.byteLength)
				scheduler.request()
			}
		} catch (error) {
			if (!signal.aborted) {
				logs.add('World state store: transform stream failed', 'error', {
					folder: 'world-state-store',
				})
				console.error('World state transform stream error:', error)
			}
		}
	}

	// The svelte-sdk's `createResourceClient` yields `undefined` whenever `useRobotClient`
	// does, so the resource client never exists without the robot client: the raw path is
	// the only path.
	const consumeChanges = async (signal: AbortSignal) => {
		const robotClient = getRobotClient()
		if (!robotClient) return
		await consumeRawChanges(robotClient, signal)
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
		scheduler.cancel()
		decodeWorker.terminate()
		pending.clear()
		pendingRaw.length = 0
		chunkLoader.dispose()
		for (const [, entity] of entities) {
			if (world.has(entity)) {
				entity.destroy()
			}
		}
		unregister()
	}
}
