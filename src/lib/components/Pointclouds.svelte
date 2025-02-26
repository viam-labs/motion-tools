<script lang="ts">
	import { T } from '@threlte/core'
	import { usePointClouds } from '$lib/hooks/usePointclouds.svelte'
	import { useFocus, useSelection } from '$lib/hooks/useSelection.svelte'
	import { useCursor, meshBounds } from '@threlte/extras'

	const pcds = usePointClouds()
	const selection = useSelection()
	const focus = useFocus()

	const { onPointerEnter, onPointerLeave } = useCursor()
</script>

{#each pcds.current as points (points.uuid)}
	<T
		is={points}
		raycast={meshBounds}
		onpointerenter={(event) => {
			event.stopPropagation()
			onPointerEnter()
		}}
		onpointerleave={(event) => {
			event.stopPropagation()
			onPointerLeave()
		}}
		onpointermissed={() => {
			selection.set(undefined)
		}}
		ondblclick={() => {
			focus.set(points)
		}}
		onclick={() => {
			selection.set(points)
		}}
	/>
{/each}
