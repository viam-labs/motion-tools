import type { Message, SuccessMessage } from './worker'

const worker = new Worker(new URL('./worker', import.meta.url), { type: 'module' })

export const parsePcdInWorker = async (
	data: Uint8Array<ArrayBufferLike>
): Promise<SuccessMessage> => {
	return new Promise((resolve, reject) => {
		const onMessage = (event: MessageEvent<Message>) => {
			worker.removeEventListener('message', onMessage)

			if ('error' in event.data) {
				return reject(event.data.error)
			}

			resolve(event.data)
		}

		worker.addEventListener('message', onMessage)
		worker.postMessage({ data }, [data.buffer])
	})
}
