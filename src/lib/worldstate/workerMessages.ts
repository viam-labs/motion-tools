import type { TransformChangeType } from '$lib/buf/service/worldstatestore/v1/world_state_store_pb'

import type { TransformField } from './pendingTransformChanges'

/** Raw `StreamTransformChangesResponse` buffers; their backing `ArrayBuffer`s travel in the transfer list. */
export interface IngestMessage {
	type: 'ingest'
	buffers: Uint8Array[]
}

/** Asks the worker to drain everything coalesced so far into one `BatchMessage`. */
export interface FlushMessage {
	type: 'flush'
}

export type MainToWorkerMessage = IngestMessage | FlushMessage

export interface RemovedBatchChange {
	uuid: string
	changeType: TransformChangeType.REMOVED
}

/**
 * `transform` is the merged `Transform.toBinary()`, transferred, decoded on main once per
 * changed entity. `fields` mirrors `PendingChange.fields`: `undefined` means full state.
 */
export interface UpsertBatchChange {
	uuid: string
	changeType: TransformChangeType.ADDED | TransformChangeType.UPDATED
	transform: Uint8Array
	fields: TransformField[] | undefined
}

export type BatchChange = RemovedBatchChange | UpsertBatchChange

/** One merged entry per changed UUID, in first-mention order. `ingested` counts buffers decoded since the last batch. */
export interface BatchMessage {
	type: 'batch'
	changes: BatchChange[]
	ingested: number
}

export type WorkerToMainMessage = BatchMessage

/** Main-thread handle on the decode worker. One per store; `terminate` in the store's cleanup. */
export interface TransformDecodeWorker {
	/** Posts the buffers with their backing stores in the transfer list; the caller must not touch them afterwards. */
	ingest(buffers: Uint8Array[]): void
	/** Requests one `BatchMessage`; the answer arrives through the `onBatch` callback given at creation. */
	requestBatch(): void
	terminate(): void
}
