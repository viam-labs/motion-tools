<script lang="ts">
	import { T } from '@threlte/core'
	import { useWebsocketClient } from '$lib/hooks/useWebsocketClient.svelte'

	const shapes = useWebsocketClient()

	$inspect(shapes.current[0])
</script>

{#each shapes.current as shape}
	{@const { dimsMm } = shape.box ?? {}}
	{@const { x = 0, y = 0, z = 0 } = dimsMm}
	<T.Mesh position={[shape.center.x ?? 0, shape.center.y ?? 0, shape.center.z ?? 0]}>
		<T.BoxGeometry args={[x / 1000, y / 1000, z / 1000]} />

		<T.MeshToonMaterial
			color="red"
			transparent
			opacity={0.7}
		/>
	</T.Mesh>
{/each}
