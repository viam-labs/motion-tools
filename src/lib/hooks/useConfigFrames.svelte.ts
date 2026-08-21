import { Transform } from '@viamrobotics/sdk'
import { getContext, setContext } from 'svelte'

import { createTransformFromFrame, type Frame } from '$lib/frame'

import { useFragmentInfo } from './useFragmentInfo.svelte'
import { usePartConfig } from './usePartConfig.svelte'

const key = Symbol('config-frames-context')

interface ConfigFramesContext {
	unsetFrames: string[]
	current: Record<string, Transform>
}

export const provideConfigFrames = () => {
	const partConfig = usePartConfig()
	const fragmentInfo = useFragmentInfo()

	const [configFrames, configUnsetFrameNames] = $derived.by(() => {
		const { components } = partConfig.current

		const results: Record<string, Transform> = {}
		const unsetResults: string[] = []

		for (const { name, frame } of components ?? []) {
			if (!frame) {
				unsetResults.push(name)
				continue
			}

			results[name] = createTransformFromFrame(name, frame)
		}

		return [results, unsetResults]
	})

	const [fragmentFrames, fragmentUnsetFrameNames] = $derived.by(() => {
		const { fragment_mods: fragmentMods = [] } = partConfig.current
		const fragmentDefinedComponents = Object.keys(fragmentInfo.current ?? {})

		const results: Record<string, Transform> = {}
		const unsetResults: string[] = []

		for (const fragmentComponentName of fragmentDefinedComponents || []) {
			const fragmentId = fragmentInfo.current[fragmentComponentName].id
			const fragmentMod = fragmentMods?.find((mod) => mod.fragment_id === fragmentId)

			if (!fragmentMod) {
				continue
			}

			const setComponentModIndex = fragmentMod.mods.findLastIndex(
				(mod) => mod['$set']?.[`components.${fragmentComponentName}.frame`] !== undefined
			)
			const unsetComponentModIndex = fragmentMod.mods.findLastIndex(
				(mod) => mod['$unset']?.[`components.${fragmentComponentName}.frame`] !== undefined
			)

			if (setComponentModIndex < unsetComponentModIndex) {
				unsetResults.push(fragmentComponentName)
			} else if (unsetComponentModIndex < setComponentModIndex) {
				const frameData = fragmentMod.mods[setComponentModIndex]['$set'][
					`components.${fragmentComponentName}.frame`
				] as Frame
				results[fragmentComponentName] = createTransformFromFrame(fragmentComponentName, frameData)
			}
		}
		return [results, unsetResults]
	})

	const frames = $derived.by(() => {
		const result = {
			...configFrames,
			...fragmentFrames,
		}

		return result
	})

	const unsetFrames = $derived([...new Set([...configUnsetFrameNames, ...fragmentUnsetFrameNames])])

	setContext<ConfigFramesContext>(key, {
		get unsetFrames() {
			return unsetFrames
		},
		get current() {
			return frames
		},
	})
}

export const useConfigFrames = (): ConfigFramesContext => {
	return getContext<ConfigFramesContext>(key)
}
