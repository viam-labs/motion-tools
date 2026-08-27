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
	useResourceNames,
} from '@viamrobotics/svelte-sdk'

import type { Shape } from '$lib/buf/draw/v1/drawing_pb'
import type { Metadata } from '$lib/metadata'

import { asFloat32Array, inMeters, STRIDE } from '$lib/buffer'
import { createChunkLoader, type EntityChunk } from '$lib/chunking'
import {
	drawDrawing,
	type DrawingLike,
	drawTransform,
	shapeFromStruct,
	updateDrawing,
	updateMetadata,
	updateModel,
} from '$lib/draw'
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
		const cleanups: (() => void)[] = []

		for (const client of clients) {
			cleanups.push(createWorldState(client))
		}

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

/** Stands in for an empty FieldMask, which means every field changed. */
const ALL_TRANSFORM_PATHS = ['pose_in_observer_frame', 'physical_object', 'metadata']

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

const createWorldState = (client: { current: WorldStateStoreClient | undefined }) => {
	const { invalidate } = useThrelte()
	const world = useWorld()
	const relationships = useRelationships()

	const entities = new Map<string, Entity>()
	// UUIDs of projected model drawings, which spawn a root plus one sub-entity per asset and
	// so cannot be torn down with a plain destroy.
	const modelRoots = new Set<string>()
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

	/**
	 * Builds the drawing a projected transform stands for. Frame, pose and UUID ride natively;
	 * only the shape had to travel in the metadata Struct.
	 */
	const toDrawing = (
		transform: TransformWithUUID,
		shape: Shape,
		metadata: Metadata
	): DrawingLike => ({
		referenceFrame: transform.referenceFrame,
		poseInObserverFrame: transform.poseInObserverFrame,
		physicalObject: shape,
		uuid: transform.uuid,
		metadata,
	})

	/**
	 * Element count of the first chunk that actually arrived, which is fewer than `chunk_size`
	 * when the producer was still filling its buffer.
	 */
	const firstChunkEnd = (shape: Shape | undefined): number | undefined => {
		if (shape?.geometryType.case !== 'points') return undefined
		return (
			shape.geometryType.value.positions.length /
			(STRIDE.POSITIONS * Float32Array.BYTES_PER_ELEMENT)
		)
	}

	const spawnEntity = (transform: TransformWithUUID) => {
		const uuid = transform.uuidString
		if (entities.has(uuid) || removedUUIDs.has(uuid)) {
			return
		}

		const parsedMetadata = metadataFromStruct(transform.metadata?.fields)
		const shape = shapeFromStruct(transform.metadata?.fields)

		const spawned = shape
			? drawDrawing(world, toDrawing(transform, shape, parsedMetadata), traits.WorldStateStoreAPI, {
					removable: false,
				})
			: drawTransform(world, transform, traits.WorldStateStoreAPI, { removable: false })

		entities.set(uuid, spawned.entity)
		if (shape?.geometryType.case === 'model') modelRoots.add(uuid)
		relationships.apply(spawned.entity, spawned.relationships)

		chunkLoader.start(uuid, spawned.entity, parsedMetadata, firstChunkEnd(shape))
		relationships.flush(uuid)

		if (shape || isPointCloud(transform.physicalObject?.geometryType)) invalidate()
	}

	const destroyEntity = (uuid: string) => {
		removedUUIDs.add(uuid)

		const entity = entities.get(uuid)

		if (!entity) return

		if (world.has(entity)) {
			// A model is a root plus one sub-entity per asset; destroying only the root would leave
			// its meshes at the world origin. Everything else keeps the plain destroy, so frames
			// parented to it survive as orphans.
			if (modelRoots.has(uuid)) {
				hierarchy.destroyEntityTree(world, entity)
			} else {
				entity.destroy()
			}
		}

		modelRoots.delete(uuid)
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

	/**
	 * Re-applies a projected drawing wholesale.
	 *
	 * Its shape, colors and visibility all live in one metadata Struct, so any change to them
	 * arrives as a single `metadata` path. There is nothing finer to act on.
	 */
	const updateProjectedDrawing = (
		transform: TransformWithUUID,
		entity: Entity,
		shape: Shape,
		metadata: Metadata
	) => {
		const uuid = transform.uuidString

		// A chunked drawing restarts its pull from scratch, so the half-filled buffer the previous
		// pull was writing into has to go with it.
		if ((metadata.chunks?.total ?? 0) > 0) {
			destroyEntity(uuid)
			removedUUIDs.delete(uuid)
			spawnEntity(transform)
			return
		}

		const drawing = toDrawing(transform, shape, metadata)
		const isModel = shape.geometryType.case === 'model'

		const result = isModel
			? updateModel(world, entity, drawing, traits.WorldStateStoreAPI, { removable: false })
			: updateDrawing(world, entity, drawing, { removable: false })

		entities.set(uuid, result.entity)
		if (isModel) modelRoots.add(uuid)
		relationships.apply(result.entity, result.relationships)
	}

	const updateEntity = (transform: TransformWithUUID, changes: (string | number)[]) => {
		const entity = entities.get(transform.uuidString)

		if (!entity) {
			void spawnFromServer(transform.uuidString)
			return
		}

		const shape = shapeFromStruct(transform.metadata?.fields)
		if (shape) {
			updateProjectedDrawing(
				transform,
				entity,
				shape,
				metadataFromStruct(transform.metadata?.fields)
			)
			return
		}

		let metadataDirty = false

		// An empty mask means every field changed, per the FieldMask convention — re-adding an
		// existing UUID reports exactly that. Acting path by path would drop the whole redraw.
		const paths = changes.length > 0 ? changes : ALL_TRANSFORM_PATHS

		for (const rawPath of paths) {
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
		void consumeChanges(controller.signal)

		return () => {
			controller.abort()
		}
	})

	return () => {
		if (rafId) cancelAnimationFrame(rafId)
		pendingEvents = []
		chunkLoader.dispose()
		for (const [uuid, entity] of entities) {
			if (!world.has(entity)) continue

			if (modelRoots.has(uuid)) {
				hierarchy.destroyEntityTree(world, entity)
			} else {
				entity.destroy()
			}
		}
		entities.clear()
		modelRoots.clear()
	}
}
