<script lang="ts">
	import { T } from '@threlte/core'
	import { Portal, PortalTarget } from '@threlte/extras'
	import { useShapes } from '$lib/hooks/useShapes.svelte'
	import Clickable from './Clickable.svelte'
	import Frame from './Frame.svelte'

	const shapes = useShapes()
</script>

{#each shapes.current as object (object.name)}
	<Portal id={object.referenceFrame}>
		<Frame {object}>
			<PortalTarget id={object.name} />
		</Frame>
	</Portal>
{/each}

{#each shapes.meshes as object (object.uuid)}
	<Portal id={object.referenceFrame}>
		<Frame {object}>
			<PortalTarget id={object.name} />
		</Frame>
	</Portal>
{/each}

<T
	name={shapes.object3ds.batchedArrow.object3d.name}
	is={shapes.object3ds.batchedArrow.object3d}
/>

{#each shapes.nurbs as object (object.uuid)}
	<Portal id={object.referenceFrame}>
		<Frame {object}>
			<PortalTarget id={object.name} />
		</Frame>
	</Portal>
{/each}

{#each shapes.models as object (object.uuid)}
	<Clickable
		name={object.name}
		object={object.metadata.gltf.scene}
	>
		<PortalTarget id={object.name} />
	</Clickable>
{/each}
