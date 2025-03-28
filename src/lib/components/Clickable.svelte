<script lang="ts">
	import { T, type Props as ThrelteProps } from '@threlte/core'
	import { meshBounds, useCursor } from '@threlte/extras'
	import type { Snippet } from 'svelte'
	import type { Mesh, Points, Object3D } from 'three'
	import { useFocus, useSelection } from '$lib/hooks/useSelection.svelte'
	import { useVisibility } from '$lib/hooks/useVisibility.svelte'

	interface Props extends ThrelteProps<Object3D> {
		object: Mesh | Points
		name: string
		children: Snippet
	}

	let { object, name, children, ...rest }: Props = $props()

	const { onPointerEnter, onPointerLeave } = useCursor()
	const selection = useSelection()
	const focus = useFocus()
	const visibility = useVisibility()
</script>

<T
	is={object}
	{name}
	raycast={meshBounds}
	visible={visibility.current.get(name)}
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
	ondblclick={(event) => {
		event.stopPropagation()
		focus.set(name)
	}}
	onclick={(event) => {
		event.stopPropagation()
		selection.set(name)
	}}
	{...rest}
>
	{@render children()}
</T>
