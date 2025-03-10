<script lang="ts">
	import { T } from '@threlte/core'
	import type { Snippet } from 'svelte'
	import type { Points } from 'three'
	import { useCursor, meshBounds } from '@threlte/extras'
	import { useFocus, useSelection } from '$lib/hooks/useSelection.svelte'

	interface Props {
		points: Points
		children?: Snippet
	}

	let { points, children }: Props = $props()

	const selection = useSelection()
	const focus = useFocus()
	const { onPointerEnter, onPointerLeave } = useCursor()
</script>

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
		focus.set(points?.name)
	}}
	onclick={() => {
		selection.set(points?.name)
	}}
>
	{@render children?.()}
</T>
