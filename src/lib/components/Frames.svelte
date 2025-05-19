<script lang="ts">
	import { Portal, PortalTarget } from './portal'
	import Frame from './Frame.svelte'
	import { useFrames } from '$lib/hooks/useFrames.svelte'
	import { useGeometries } from '$lib/hooks/useGeometries.svelte'
	import Pose from './Pose.svelte'

	const frames = useFrames()
	const geometries = useGeometries()
</script>

{#each frames.current as object (object.uuid)}
	<Pose name={object.name}>
		{#snippet children({ pose })}
			{#if pose}
				<Frame
					uuid={object.uuid}
					name={object.name}
					{pose}
					geometry={object.geometry}
					metadata={object.metadata}
				>
					<PortalTarget id={object.name} />
				</Frame>
			{:else}
				<Portal id={object.referenceFrame}>
					<Frame
						uuid={object.uuid}
						name={object.name}
						pose={pose ?? object.pose}
						geometry={object.geometry}
						metadata={object.metadata}
					>
						<PortalTarget id={object.name} />
					</Frame>
				</Portal>
			{/if}
		{/snippet}
	</Pose>
{/each}

{#each geometries.current as object (object.uuid)}
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
