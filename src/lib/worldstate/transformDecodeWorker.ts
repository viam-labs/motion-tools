import type {
	BatchMessage,
	MainToWorkerMessage,
	TransformDecodeWorker,
	WorkerToMainMessage,
} from './workerMessages'

import { workerCode } from './worker.inline'

const isExactView = (bytes: Uint8Array): boolean =>
	bytes.byteOffset === 0 && bytes.byteLength === bytes.buffer.byteLength

/**
 * Spins up one decode worker and returns the main-thread handle on it. Call `terminate` when
 * the caller is done, typically in the owning store's cleanup.
 */
export const createTransformDecodeWorker = (
	onBatch: (batch: BatchMessage) => void
): TransformDecodeWorker => {
	const blob = new Blob([workerCode], { type: 'text/javascript' })
	const url = URL.createObjectURL(blob)
	const worker = new Worker(url)

	worker.addEventListener('message', (event: MessageEvent<WorkerToMainMessage>) => {
		if (event.data.type === 'batch') {
			onBatch(event.data)
		}
	})

	return {
		ingest(buffers) {
			if (buffers.length === 0) {
				return
			}

			// A view sharing its buffer with other data would have that data detached too, so
			// only an exact view travels by transfer; anything else is copied first.
			const outgoing = buffers.map((bytes) => (isExactView(bytes) ? bytes : new Uint8Array(bytes)))
			const transfer = [...new Set(outgoing.map((bytes) => bytes.buffer))] as ArrayBuffer[]

			const message: MainToWorkerMessage = { type: 'ingest', buffers: outgoing }
			worker.postMessage(message, transfer)
		},
		requestBatch() {
			const message: MainToWorkerMessage = { type: 'flush' }
			worker.postMessage(message)
		},
		terminate() {
			worker.terminate()
			URL.revokeObjectURL(url)
		},
	}
}
