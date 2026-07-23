<script lang="ts">
	import type { Intersection, Vector3 } from 'three'

	import { useMouseRaycaster } from '$lib/hooks/useMouseRaycaster.svelte'

	import { worldNormalFromFace } from './buildTargetPose'
	import MoveTargetMarker from './MoveTargetMarker.svelte'

	interface Props {
		enabled: boolean
		standoff: number
		onPick: (hit: { worldPoint: Vector3; worldNormal?: Vector3 }) => void
	}

	const { enabled, standoff, onPick }: Props = $props()

	let point = $state.raw<Vector3>()
	let worldNormal = $state.raw<Vector3>()

	const { onclick, onmove, raycaster } = useMouseRaycaster(() => ({ enabled }))
	raycaster.firstHitOnly = true
	raycaster.params.Points.threshold = 0.005

	const normalFor = (hit: Intersection): Vector3 | undefined => {
		const faceNormal = hit.face?.normal
		if (!faceNormal) return undefined
		return worldNormalFromFace(faceNormal, hit.object.matrixWorld)
	}

	onmove((event) => {
		const hit = event.intersections[0]
		if (!hit) {
			point = undefined
			worldNormal = undefined
			return
		}

		point = hit.point
		worldNormal = normalFor(hit)
	})

	onclick(() => {
		if (!point) return
		onPick({ worldPoint: point.clone(), worldNormal: worldNormal?.clone() })
	})

	// Drop the hover preview when picking is handed off or the panel leaves the tab.
	$effect(() => {
		if (!enabled) {
			point = undefined
			worldNormal = undefined
		}
	})
</script>

{#if enabled && point}
	<MoveTargetMarker
		{point}
		{worldNormal}
		{standoff}
	/>
{/if}
