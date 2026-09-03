<script lang="ts">
	import type { Entity } from 'koota'

	import { useThrelte } from '@threlte/core'
	import {
		Struct,
		type TransformChangeEvent,
		TransformChangeType,
		type TransformWithUUID,
		WorldStateStoreClient,
	} from '@viamrobotics/sdk'
	import { createResourceClient } from '@viamrobotics/svelte-sdk'

	import type {
		PendingChange,
		PendingTransformChanges,
		TransformField,
	} from '$lib/worldstate/pendingTransformChanges'

	import { createChunkLoader } from '$lib/chunking'
	import { drawTransform, updateMetadata } from '$lib/draw'
	import { hierarchy, traits, useWorld } from '$lib/ecs'
	import { isPointCloud } from '$lib/geometry'
	import { createStreamStats } from '$lib/hooks/createStreamStats'
	import { useRelationships } from '$lib/hooks/useRelationships.svelte'
	import { useWorldStateStreamStats } from '$lib/hooks/worldStateStreamStats'
	import { Pose } from '$lib/math'
	import { metadataFromStruct } from '$lib/metadata'
	import { useLogs } from '$lib/plugins/Logs/useLogs.svelte'
	import { mergeChange } from '$lib/worldstate/coalesceTransformChanges'

	import { decodeWorldStateChunk } from './decodeWorldStateChunk'

	type TransformEvent = TransformChangeEvent & {
		transform: TransformWithUUID
	}

	interface Props {
		partID: string
		name: string
	}

	let { partID, name }: Props = $props()

	const { invalidate } = useThrelte()
	const world = useWorld()
	const relationships = useRelationships()
	const logs = useLogs()

	const stats = createStreamStats()
	const streamStats = useWorldStateStreamStats()

	$effect(() => streamStats?.register(name, stats))

	const client = createResourceClient(
		WorldStateStoreClient,
		() => partID,
		() => name
	)

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
			logs.add(`World state store: could not fetch transform ${uuid}`, 'error', {
				folder: 'world-state-store',
			})
			console.error('World state self-heal failed for', uuid, error)
		} finally {
			pendingSpawns.delete(uuid)
		}
	}

	// `fields` is `undefined` for full state (an ADDED, a respawn applied as an update, or an
	// UPDATED whose mask was empty); a set updates only the groups it names.
	const updateEntity = (transform: TransformWithUUID, fields: Set<TransformField> | undefined) => {
		const entity = entities.get(transform.uuidString)

		if (!entity) {
			void spawnFromServer(transform.uuidString)
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

	let seeded = false
	let flushScheduled = false
	let rafId = 0
	const pending: PendingTransformChanges = new Map()

	/**
	 * Draws what the store already holds, once, so the scene is populated before
	 * the stream starts reporting changes.
	 *
	 * Direct calls rather than queries. Nothing reads this result again, so the
	 * cache buys nothing, and building one query per uuid meant rebuilding every
	 * observer each time the uuid list changed identity.
	 */
	const seedEntities = async (signal: AbortSignal) => {
		const activeClient = client.current
		if (!activeClient || seeded) return

		try {
			const uuids = await activeClient.listUUIDs(undefined, { signal })
			if (signal.aborted) return

			// Settled, not all: one unreadable transform drops itself rather than the
			// whole snapshot, which is what a query per uuid gave us.
			const transforms = await Promise.allSettled(
				uuids.map((uuid) => activeClient.getTransform(uuid, undefined, { signal }))
			)
			if (signal.aborted) return

			for (const transform of transforms) {
				if (transform.status === 'fulfilled') spawnEntity(transform.value)
			}

			// Set last, so a throw above leaves the snapshot undrawn and the next
			// connection tries again instead of skipping the seed forever.
			seeded = true

			const failed = transforms.filter((transform) => transform.status === 'rejected').length
			if (failed > 0) {
				logs.add(`World state store: ${failed} of ${uuids.length} transforms failed`, 'error', {
					folder: 'world-state-store',
				})
			}

			invalidate()
		} catch (error) {
			if (signal.aborted) return

			logs.add('World state store: could not load the current transforms', 'error', {
				folder: 'world-state-store',
			})
			console.error('World state seed failed:', error)
		}
	}

	/**
	 * A server republish of an already-spawned UUID arrives as REMOVED-then-ADDED, but the
	 * store's stable UUID means the same reference frame reappearing is a respawn, not a new
	 * entity: update the existing entity in place instead of paying for a destroy and a spawn.
	 */
	const applyChange = (uuid: string, change: PendingChange) => {
		switch (change.changeType) {
			case TransformChangeType.ADDED: {
				removedUUIDs.delete(uuid)
				const existing = entities.get(uuid)
				if (existing && existing.get(traits.Name) === change.transform.referenceFrame) {
					updateEntity(change.transform, undefined)
					return
				}
				if (existing) destroyEntity(uuid)
				spawnEntity(change.transform)
				return
			}
			case TransformChangeType.REMOVED: {
				destroyEntity(uuid)
				return
			}
			case TransformChangeType.UPDATED: {
				updateEntity(change.transform, change.fields)
				return
			}
			default: {
				console.error('Unspecified change type.', change)
			}
		}
	}

	const flush = () => {
		const start = performance.now()
		const applied = pending.size
		for (const [uuid, change] of pending) {
			applyChange(uuid, change)
		}
		pending.clear()

		if (applied > 0) invalidate()
		stats.recordFlush({ start, end: performance.now(), applied, backlog: 0 })
	}

	const scheduleFlush = () => {
		if (flushScheduled) return
		flushScheduled = true

		rafId = requestAnimationFrame(() => {
			rafId = 0
			flushScheduled = false
			flush()
		})
	}

	/**
	 * Consumes the `streamTransformChanges` server stream directly. Each event coalesces
	 * into `pending`, keyed by UUID, so a burst of deltas for one entity costs one apply on
	 * the next frame. Mirrors `useDrawService`'s stream consumption.
	 */
	const consumeChanges = async (signal: AbortSignal) => {
		const activeClient = client.current
		if (!activeClient) return

		try {
			for await (const event of activeClient.streamTransformChanges(undefined, { signal })) {
				if (signal.aborted) break
				if (!event.transform) continue

				mergeChange(pending, event as TransformEvent)
				stats.recordIngest(1)
				scheduleFlush()
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

	$effect(() => {
		if (!client.current) return

		const controller = new AbortController()

		// The entities survived the disconnect, so any pull that ran out of client
		// mid-stream still owes its point cloud the rest of its chunks.
		chunkLoader.resume()
		void seedEntities(controller.signal)
		void consumeChanges(controller.signal)

		return () => {
			controller.abort()
		}
	})

	$effect(() => {
		return () => {
			if (rafId) cancelAnimationFrame(rafId)
			pending.clear()
			chunkLoader.dispose()
			for (const [, entity] of entities) {
				if (world.has(entity)) {
					entity.destroy()
				}
			}
			entities.clear()
		}
	})
</script>
