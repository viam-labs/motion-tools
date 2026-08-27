<script lang="ts">
	import RefreshRate from '$lib/components/overlay/RefreshRate.svelte'
	import { usePointcloudObjects } from '$lib/hooks/usePointcloudObjects.svelte'
	import { usePointClouds } from '$lib/hooks/usePointclouds.svelte'
	import { usePoses } from '$lib/hooks/usePoses.svelte'
	import { RefreshRates } from '$lib/hooks/useSettings.svelte'

	const pointclouds = usePointClouds()
	const pointcloudObjects = usePointcloudObjects()
	const poses = usePoses()
</script>

<div class="flex flex-col gap-2.5 text-xs">
	<h3 class="border-gray-3 border-b py-1 text-sm"><strong>Polling rates</strong></h3>

	<RefreshRate
		id={RefreshRates.poses}
		label="Poses"
		allowLive
		onManualRefetch={() => {
			poses.refetch()
		}}
	/>
	<RefreshRate
		id={RefreshRates.pointclouds}
		label="Pointclouds from cameras"
		onManualRefetch={() => {
			pointclouds.refetch()
		}}
	/>
	<RefreshRate
		id={RefreshRates.vision}
		label="Vision service pointcloud segments and objects"
		onManualRefetch={() => {
			pointcloudObjects.refetch()
		}}
	/>
</div>
