import { type Intersection } from 'three'

import { useMouseRaycaster } from '$lib/hooks/useMouseRaycaster.svelte'

import { useCancelGesture } from './useGestures.svelte'
import { useGizmos } from './useGizmos.svelte'

interface Options<Hit> {
	findHit: (intersections: Intersection[]) => Hit | undefined
	onPlace: (hit: Hit) => void
}

export const usePlace = <Hit>(options: () => Options<Hit>) => {
	const plugin = useGizmos()
	const { onclick, onmove } = useMouseRaycaster(() => ({
		enabled: true,
		firstHitOnly: true,
	}))

	useCancelGesture(plugin.exit)

	let hit = $state.raw<Hit>()

	onmove((event) => (hit = options().findHit(event.intersections)))
	onclick((event) => {
		const next = options().findHit(event.intersections)
		if (next === undefined) return

		options().onPlace(next)
	})

	return {
		get current() {
			return hit
		},
	}
}
