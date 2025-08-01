<script lang="ts">
	import { T } from '@threlte/core'
	import { Portal, PortalTarget } from './portal'
	import { useDrawAPI } from '$lib/hooks/useDrawAPI.svelte'
	import WorldObject from './WorldObject.svelte'
	import Frame from './Frame.svelte'
	import Line from './Line.svelte'

	const drawAPI = useDrawAPI()
</script>

<T
	name={drawAPI.object3ds.batchedArrow.object3d.name}
	is={drawAPI.object3ds.batchedArrow.object3d}
	dispose={false}
/>

{#each drawAPI.meshes as object (object.uuid)}
	<Portal id={object.referenceFrame}>
		<Frame
			uuid={object.uuid}
			name={object.name}
			pose={object.pose}
			geometry={object.geometry}
			metadata={object.metadata}
		>
			<PortalTarget id={object.name} />
		</Frame>
	</Portal>
{/each}

{#each drawAPI.nurbs as object (object.uuid)}
	<Portal id={object.referenceFrame}>
		<Frame
			uuid={object.uuid}
			name={object.name}
			pose={object.pose}
			geometry={object.geometry}
			metadata={object.metadata}
		>
			<PortalTarget id={object.name} />
		</Frame>
	</Portal>
{/each}

{#each drawAPI.models as object (object.uuid)}
	<WorldObject {object}>
		<PortalTarget id={object.name} />
	</WorldObject>
{/each}

{#each drawAPI.lines as object (object.uuid)}
	<Line {object} />
{/each}
