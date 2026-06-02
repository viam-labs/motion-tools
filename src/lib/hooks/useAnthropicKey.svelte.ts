import { del, get, set } from 'idb-keyval'
import { getContext, setContext } from 'svelte'

const key = Symbol('anthropic-key-context')
const STORE_KEY = 'motion-tools-anthropic-key'

interface AnthropicKeyContext {
	readonly current: string
	save(value: string): void
	clear(): void
}

export const provideAnthropicKey = (): void => {
	let apiKey = $state('')

	get(STORE_KEY).then((stored: string | undefined) => {
		if (stored) apiKey = stored
	})

	setContext<AnthropicKeyContext>(key, {
		get current() {
			return apiKey
		},
		save(value: string) {
			apiKey = value
			if (value) {
				set(STORE_KEY, value)
			} else {
				del(STORE_KEY)
			}
		},
		clear() {
			apiKey = ''
			del(STORE_KEY)
		},
	})
}

export const useAnthropicKey = (): AnthropicKeyContext => {
	return getContext<AnthropicKeyContext>(key)
}
