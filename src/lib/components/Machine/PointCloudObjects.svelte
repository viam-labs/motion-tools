<script lang="ts">
	import { usePartID } from '$lib/hooks/usePartID.svelte'
	import { usePointcloudObjects } from '$lib/hooks/usePointcloudObjects.svelte'

	import PointCloudObject from './PointCloudObject.svelte'

	const partID = usePartID()
	const pointcloudObjects = usePointcloudObjects()
</script>

{#each pointcloudObjects.services as service (service.name)}
	<PointCloudObject
		partID={partID.current}
		name={service.name}
	/>
{/each}
