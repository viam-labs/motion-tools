<script lang="ts">
	import { T, type Props as ThrelteProps } from '@threlte/core'
	import type { Snippet } from 'svelte'
	import type { Object3D } from 'three'
	import type { WorldObject } from '$lib/WorldObject'
	import { useObjectProps } from '$lib/hooks/useObjectProps.svelte'

	interface Props extends ThrelteProps<Object3D> {
		object: WorldObject
		children?: Snippet
	}

	let { object, children, ...rest }: Props = $props()

	const objectProps = useObjectProps(() => object.uuid)
</script>

{#if object.metadata.gltf?.scene}
	<T
		is={object.metadata.gltf.scene}
		{...objectProps}
		{...rest}
	>
		{@render children?.()}
	</T>
{/if}
