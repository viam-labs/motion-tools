<script lang="ts">
	import { useFrames } from '$lib/hooks/useFrames.svelte'
	import { WorldObject } from '$lib/WorldObject'
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
	const frame = $derived<WorldObject | undefined>(frames.byName[resourceName.name])
	const geometries = useResourceGeometries(
		() => partID.current,
		() => resourceName
	)
</script>

{#if frame}
	<Pose {resourceName}>
		{#snippet children({ pose })}
			{#if pose}
				<Frame
					{...frame}
					{pose}
				>
					<PortalTarget id={resourceName.name} />
				</Frame>
			{:else}
				<Portal id={frame.referenceFrame ?? 'world'}>
					<Frame {...frame}>
						{#each geometries.current as geometry (geometry.uuid)}
							<Frame {...geometry} />
						{/each}

						<PortalTarget id={resourceName.name} />
					</Frame>
				</Portal>
			{/if}
		{/snippet}
	</Pose>
{/if}
