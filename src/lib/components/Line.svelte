<script lang="ts">
	import { T } from '@threlte/core'
	import { Instance, InstancedMesh } from '@threlte/extras'
	import Frame from './Frame.svelte'
	import type { WorldObject } from '$lib/WorldObject'
	import { useSettings } from '$lib/hooks/useSettings.svelte'

	interface Props {
		object: WorldObject
	}

	let { object }: Props = $props()

	const settings = useSettings()
	$inspect(object.metadata.points)
</script>

<Frame
	{...object}
	metadata={{
		...object.metadata,
		lineWidth: settings.current.lineWidth,
	}}
/>

{#if object.metadata.lineDotColor && object.metadata.points}
	<InstancedMesh frustumCulled={false}>
		<T.SphereGeometry />
		<T.MeshBasicMaterial color={object.metadata.lineDotColor} />

		{#each object.metadata.points as { x, y, z }, i (i)}
			<Instance
				position.x={x}
				position.y={y}
				position.z={z}
				scale={Number(settings.current.lineDotSize)}
			/>
		{/each}
	</InstancedMesh>
{/if}
