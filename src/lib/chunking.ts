import type { Entity, World } from 'koota'

import { writeBufferGeometryRange } from '$lib/attribute'
import { ColorFormat } from '$lib/buf/draw/v1/metadata_pb'
import { traits } from '$lib/ecs'
import { type Metadata } from '$lib/metadata'

/**
 * One chunk of an entity's point cloud. Chunking covers point-cloud positions with
 * metadata colors and opacities, and no other entity type.
 */
export interface EntityChunk {
	/** Element offset (in points) where this chunk should be written. */
	start: number
	/** Flat `[x, y, z, ...]` positions in meters. */
	positions: Float32Array
	/** Optional colors aligned with `positions`. */
	colors?: Uint8Array
	/** Optional per-vertex opacities aligned with `positions`. */
	opacities?: Uint8Array
	/** `true` when the server has no more chunks for this entity. */
	done: boolean
}

export type ChunkFetcher = (
	uuid: string,
	start: number,
	signal: AbortSignal
) => Promise<EntityChunk | null>

export interface ChunkLoaderOptions {
	world: World
	invalidate: () => void
	fetchChunk: ChunkFetcher
	colorFormat?: ColorFormat
}

export const createChunkLoader = ({
	world,
	invalidate,
	fetchChunk,
	colorFormat = ColorFormat.RGB,
}: ChunkLoaderOptions) => {
	// The pull that owns each uuid. A pull is superseded rather than rejected: an entity that
	// respawns mid-upload needs its replacement to take over, and the loop below cannot notice
	// its own entity was destroyed until the fetch it is parked on resolves.
	const active = new Map<string, number>()
	let lastToken = 0

	const controller = new AbortController()

	const pull = async (uuid: string, entity: Entity, total: number, firstChunkEnd: number) => {
		const token = ++lastToken
		active.set(uuid, token)

		const { signal } = controller
		const owns = () => !signal.aborted && active.get(uuid) === token

		let nextStart = firstChunkEnd

		try {
			while (owns()) {
				const chunk = await fetchChunk(uuid, nextStart, signal)
				if (!owns() || !chunk) break

				const buffer = entity.get(traits.BufferGeometry)
				if (!buffer) break

				writeBufferGeometryRange(buffer, chunk.positions, chunk.start, {
					colorFormat,
					colors: chunk.colors,
					opacities: chunk.opacities,
				})

				const chunkElements = chunk.positions.length / 3
				nextStart = chunk.start + chunkElements
				entity.set(traits.ChunkProgress, { loaded: nextStart, total })
				invalidate()

				if (chunk.done) break
			}
		} catch (error) {
			if (owns()) {
				console.error(`Chunk pull failed for entity ${uuid}:`, error)
			}
		} finally {
			// A superseded pull cleans up nothing: both the map entry and the ChunkProgress trait
			// now belong to the pull that replaced it.
			if (active.get(uuid) === token) {
				active.delete(uuid)
				if (world.has(entity)) {
					entity.remove(traits.ChunkProgress)
				}
			}
		}
	}

	return {
		/**
		 * Begins pulling the rest of a chunked entity.
		 *
		 * `firstChunkEnd` is how many elements really arrived: a producer still filling its buffer
		 * sends fewer than `chunk_size`, so the nominal size would leave a hole.
		 */
		start(uuid: string, entity: Entity, metadata: Metadata, firstChunkEnd?: number) {
			const chunks = metadata.chunks
			if (!chunks || chunks.total <= 0) return

			const loaded = firstChunkEnd ?? chunks.chunkSize

			entity.add(traits.ChunkProgress({ loaded, total: chunks.total }))
			void pull(uuid, entity, chunks.total, loaded)
		},

		dispose() {
			controller.abort()
		},
	}
}
