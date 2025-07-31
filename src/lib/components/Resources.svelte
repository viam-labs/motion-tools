<script lang="ts">
	import { usePartID } from '$lib/hooks/usePartID.svelte'
	import { useResourceNames } from '@viamrobotics/svelte-sdk'
	import ResourceFrame from './ResourceFrame.svelte'

	const partID = usePartID()
	const resourceNames = useResourceNames(() => partID.current)
</script>

{#each resourceNames.current as resourceName (resourceName.name)}
	<ResourceFrame {resourceName} />
{/each}
