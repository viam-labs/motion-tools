import type { JsonObject } from '@bufbuild/protobuf'

import { createAppQuery } from '@viamrobotics/svelte-sdk'
import { getContext, setContext } from 'svelte'

import type { FragmentInfo } from '$lib/hooks/usePartConfig.svelte'

const key = Symbol('fragment-info-context')

interface FragmentInfoContext {
	/** componentName -> the fragment that defines it ({ id, variables }) */
	current: Record<string, FragmentInfo>
}

/**
 * Single source of truth for which components are defined by a fragment.
 *
 * Embedded hosts own this knowledge and pass it as a top-level App prop; in
 * standalone we derive it from the part's `getRobotPart` -> `getFragment`
 * queries. Mode is fixed for the session (the prop is either always defined or
 * always undefined), mirroring `providePartConfig`.
 *
 * Must be provided BEFORE `providePartConfig`, whose frame-edit routing
 * consumes `useFragmentInfo()` to choose part-frame vs fragment-mod writes.
 */
export const provideFragmentInfo = (
	partID: () => string,
	embeddedMap: () => Record<string, FragmentInfo> | undefined
) => {
	const embedded = $derived(embeddedMap())
	const config = $derived(embedded ? { current: embedded } : useStandaloneFragmentInfo(partID))

	setContext<FragmentInfoContext>(key, {
		get current() {
			return config.current
		},
	})
}

export const useFragmentInfo = (): FragmentInfoContext => {
	return getContext<FragmentInfoContext>(key)
}

const useStandaloneFragmentInfo = (partID: () => string): FragmentInfoContext => {
	const partQuery = createAppQuery('getRobotPart', () => [partID()] as const, {
		refetchInterval: false,
	})

	const networkPartConfig = $derived(partQuery.data?.part?.robotConfig)

	const configJSON = $derived.by(() => {
		if (!networkPartConfig) {
			return undefined
		}
		try {
			return networkPartConfig.toJson() as JsonObject
		} catch {
			return undefined
		}
	})

	const fragmentQueries = $derived(
		((configJSON?.fragments ?? []) as (string | { id: string })[]).map((fragmentId) => {
			const id = typeof fragmentId === 'string' ? fragmentId : fragmentId.id
			return createAppQuery('getFragment', () => [id] as const, { refetchInterval: false })
		})
	)

	const fragmentIdToVariables = $derived.by(() => {
		const results: Record<string, Record<string, string>> = {}
		for (const fragment of (configJSON?.fragments as (
			| string
			| { id: string; variables: Record<string, string> }
		)[]) ?? []) {
			const id = typeof fragment === 'string' ? fragment : fragment.id
			const variables = typeof fragment === 'string' ? {} : (fragment.variables ?? {})
			results[id] = variables
		}
		return results
	})

	const componentNameToFragmentInfo = $derived.by(() => {
		const results: Record<string, FragmentInfo> = {}
		for (const query of fragmentQueries) {
			if (!query.data) {
				continue
			}

			const fragmentId = query.data.id
			const components = query.data?.fragment?.fields['components']?.kind

			if (components?.case === 'listValue') {
				for (const component of components.value.values) {
					if (component.kind.case === 'structValue') {
						const componentName = component.kind.value.fields['name']?.kind
						if (componentName?.case === 'stringValue') {
							results[componentName.value] = {
								id: fragmentId,
								variables: fragmentIdToVariables[fragmentId] ?? {},
							}
						}
					}
				}
			}
		}

		return results
	})

	return {
		get current() {
			return componentNameToFragmentInfo
		},
	}
}
