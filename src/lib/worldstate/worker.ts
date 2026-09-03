import type { PendingTransformChanges } from './pendingTransformChanges'
import type { MainToWorkerMessage } from './workerMessages'

import { drainToBatch, ingestBuffers } from './decodeAndCoalesce'

const pending: PendingTransformChanges = new Map()
let ingested = 0

globalThis.onmessage = (event: MessageEvent<MainToWorkerMessage>) => {
	const message = event.data

	if (message.type === 'ingest') {
		ingested += ingestBuffers(message.buffers, pending)
		return
	}

	const changes = drainToBatch(pending)
	const transfer = changes.flatMap((change) =>
		'transform' in change ? [change.transform.buffer] : []
	)

	postMessage({ type: 'batch', changes, ingested }, { transfer })
	ingested = 0
}
