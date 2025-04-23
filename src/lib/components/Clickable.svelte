<script lang="ts">
	import { T, type Props as ThrelteProps } from '@threlte/core'
	import { meshBounds, useCursor } from '@threlte/extras'
	import type { Snippet } from 'svelte'
	import type { Mesh, Points, Object3D, ArrowHelper } from 'three'
	import { useFocus, useSelection } from '$lib/hooks/useSelection.svelte'
	import { useVisibility } from '$lib/hooks/useVisibility.svelte'

	interface Props extends ThrelteProps<Object3D> {
		object: Mesh | Points | ArrowHelper | Object3D
		name: string
		children?: Snippet<[{ ref: Mesh | Points | ArrowHelper | Object3D }]>
		raycast?: typeof meshBounds
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
	visible={visibility.get(name)}
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
	{#if 'geometry' in object}
		<T is={object.geometry} />
	{/if}

	{#if 'material' in object}
		<T is={object.material} />
	{/if}

	{@render children?.({ ref: object })}
</T>
