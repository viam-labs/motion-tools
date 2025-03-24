<script lang="ts">
	import { PersistedState } from 'runed'
	import Tree from './Tree.svelte'
	import { fly } from 'svelte/transition'
	import { Keybindings } from '$lib/keybindings'
	import { ListTree } from 'lucide-svelte'
	import { buildTreeNodes } from '$lib/buildTree'

	import { useSelection } from '$lib/hooks/useSelection.svelte'
	import { useAllFrames } from '$lib/hooks/useFrames.svelte'

	const showTreeview = new PersistedState('show-treeview', false)

	const selection = useSelection()
	const allFrames = useAllFrames()
	const rootNode = $derived(buildTreeNodes(allFrames.current))
</script>

<svelte:window
	onkeydown={({ key }) => {
		if (key === Keybindings.TREEVIEW) {
			showTreeview.current = !showTreeview.current
		}
	}}
/>

<button
	class="fixed top-0 left-0 p-2"
	onclick={() => (showTreeview.current = !showTreeview.current)}
>
	<ListTree />
</button>

{#if showTreeview.current}
	<div
		class="fixed top-0 left-0 m-2 rounded-md bg-gray-100 p-2 text-xs"
		in:fly={{ duration: 250, x: -100 }}
		out:fly={{ duration: 250, x: -100 }}
	>
		{#key rootNode}
			<Tree
				{rootNode}
				selections={[selection.current ?? '']}
				onSelectionChange={(event) => {
					selection.set(event.selectedValue[0])
				}}
			/>
		{/key}
	</div>
{/if}
