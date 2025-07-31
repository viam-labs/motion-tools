<script lang="ts">
	import { useFrames } from '$lib/hooks/useFrames.svelte'
	import type { ResourceName } from '@viamrobotics/sdk'
	import Frame from './Frame.svelte'
	import { useResourceGeometries } from '$lib/hooks/useResourceGeometries.svelte'
	import { usePartID } from '$lib/hooks/usePartID.svelte'
	import PortalTarget from './portal/PortalTarget.svelte'
	import Portal from './portal/Portal.svelte'
	import Pose from './Pose.svelte'

	interface Props {
		resourceName: ResourceName
	}

	let { resourceName }: Props = $props()

	const partID = usePartID()
	const frames = useFrames()
	const frame = $derived.by(() => {
		for (const value of frames.current) {
			if (value.name === resourceName.name) {
				return value
			}
		}
	})
	const geometries = useResourceGeometries(
		() => partID.current,
		() => resourceName
	)
</script>

{#if frame}
	<Portal id={frame?.referenceFrame ?? 'world'}>
		<Pose
			{resourceName}
			parent={frame?.referenceFrame}
		>
			<Frame
				uuid={frame.uuid}
				name={frame.name}
				pose={frame.pose}
				geometry={frame.geometry}
				metadata={frame.metadata}
			></Frame>
		</Pose>
	</Portal>

	<Pose
		{resourceName}
		parent="world"
	>
		<Frame
			uuid={frame.uuid}
			name={frame.name}
			pose={frame.pose}
			metadata={frame.metadata}
		>
			<PortalTarget id={resourceName.name} />

			{#each geometries.current as geometry (geometry.uuid)}
				<Frame {...geometry} />
			{/each}
		</Frame>
	</Pose>
{/if}
