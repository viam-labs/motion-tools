import { getContext, setContext } from 'svelte'

export type FragmentInfo = {
	id: string
	variables: Record<string, string>
}

const key = Symbol('component-name-to-fragment-info-context')

export const provideComponentNameToFragmentInfo = (componentNameToFragmentInfo: Record<string, FragmentInfo>) => {
	setContext(key, componentNameToFragmentInfo)
}

export const useComponentNameToFragmentInfo = () => {
	return getContext<Record<string, FragmentInfo>>(key)
}



/**
 * 
 * const componentNameToFragmentInfo = $derived.by(() => {
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
						if (componentName.case === 'stringValue') {
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
			const variables = typeof fragment === 'string' ? {} : fragment.variables
			results[id] = variables
		}
		return results
	})


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
 */