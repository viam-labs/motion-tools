<script lang="ts">
	import { IconButton } from '@viamrobotics/prime-core'

	import { useSettings } from '$lib/hooks/useSettings.svelte'

	import Tooltip from '../Tooltip.svelte'

	const settings = useSettings()

	const grouped = $derived(settings.current.treeGrouping === 'sections')
	const label = $derived(grouped ? 'Show scene hierarchy' : 'Group by source')
</script>

<!--
	Opens to the side rather than below: the panel is docked left and only 240px
	wide, so a bottom-placed tooltip covers the tree it is describing.
-->
<Tooltip placement="right-start">
	<IconButton
		icon={grouped ? 'subdirectory-arrow-right' : 'layers-triple-outline'}
		{label}
		variant="ghost"
		cx="shrink-0"
		onclick={() => {
			settings.current.treeGrouping = grouped ? 'hierarchy' : 'sections'
		}}
	/>

	{#snippet content()}
		{label}
	{/snippet}
</Tooltip>
