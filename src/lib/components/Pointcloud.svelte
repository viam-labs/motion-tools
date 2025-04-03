<script lang="ts">
	import type { Snippet } from 'svelte'
	import type { Points } from 'three'
	import Clickable from './Clickable.svelte'
	import { meshBounds } from '@threlte/extras'

	interface Props {
		points: Points
		children?: Snippet
	}

	let { points, children }: Props = $props()
</script>

<Clickable
	object={points}
	name={points.name}
	raycast={meshBounds}
>
	{@render children?.()}
</Clickable>
