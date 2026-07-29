import { parentFrameOptions } from '$lib/parentFrameOptions'

import { useConfigFrames } from './useConfigFrames.svelte'
import { useFragmentInfo } from './useFragmentInfo.svelte'
import { useFrames } from './useFrames.svelte'

/**
 * Reactive list of frames the named frame may be reparented to.
 *
 * Sourced from `useFrames` — the machine's frame system merged with the part
 * config — rather than the part config alone. Components a fragment provides
 * never appear in `partConfig.components`, and components on remote parts never
 * appear in this part's config at all, so a config-only list silently omits
 * frames that are perfectly valid parents.
 */
export const useParentFrameOptions = (
	componentName: () => string | undefined
): { readonly current: string[] } => {
	const frames = useFrames()
	const configFrames = useConfigFrames()
	const fragmentInfo = useFragmentInfo()

	const current = $derived(
		parentFrameOptions({
			frames: frames.current,
			fragmentComponentNames: Object.keys(fragmentInfo.current),
			unsetFrameNames: configFrames.unsetFrames,
			componentName: componentName(),
		})
	)

	return {
		get current() {
			return current
		},
	}
}
