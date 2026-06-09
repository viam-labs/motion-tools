import { getContext, setContext } from 'svelte'

import { backendIP, websocketPort } from '$lib/defines'
import { useSettings } from '$lib/hooks/useSettings.svelte'
import { type InferCallback } from '$lib/plugins'

const key = Symbol('standalone-llm-context')

interface StandaloneLLMContext {
	current: InferCallback
}

export const provideStandaloneLLM = (): StandaloneLLMContext => {
	const settings = useSettings()
	const standaloneInfer: InferCallback = async (prompt, components) => {
		const res = await fetch(`http://${backendIP}:${websocketPort}/scene-builder`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				prompt,
				components,
				anthropicKey: settings.current.anthropicKey || undefined,
			}),
		})
		if (!res.ok) {
			throw new Error(`${res.status}: ${await res.text()}`)
		}
		return res.json()
	}

	const context = setContext<StandaloneLLMContext>(key, {
		get current() {
			return standaloneInfer
		},
	})

	return context
}

export const useStandaloneLLMContext = (): StandaloneLLMContext => {
	return getContext<StandaloneLLMContext>(key)
}
