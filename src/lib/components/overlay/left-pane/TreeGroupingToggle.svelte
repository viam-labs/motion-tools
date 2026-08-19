<script lang="ts">
	import { IconButton } from '@viamrobotics/prime-core'

	import { useSettings } from '$lib/hooks/useSettings.svelte'

	import Tooltip from '../Tooltip.svelte'

	const settings = useSettings()

	const foldered = $derived(settings.current.treeGrouping === 'folders')
	const label = $derived(foldered ? 'Show scene hierarchy' : 'Group into folders')
</script>

<!--
	Opens to the side rather than below: the panel is docked left and only 240px
	wide, so a bottom-placed tooltip covers the tree it is describing.
-->
<Tooltip placement="right-start">
	<IconButton
		icon={foldered ? 'subdirectory-arrow-right' : 'folder'}
		{label}
		variant="ghost"
		cx="shrink-0"
		onclick={() => {
			settings.current.treeGrouping = foldered ? 'hierarchy' : 'folders'
		}}
	/>

	{#snippet content()}
		{label}
	{/snippet}
</Tooltip>
