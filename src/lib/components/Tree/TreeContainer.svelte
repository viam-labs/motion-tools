<script lang="ts">
	import { PersistedState } from 'runed'
	import Tree from './Tree.svelte'
	import { fly } from 'svelte/transition'
	import { Keybindings } from '$lib/keybindings'
	import { ListTree } from 'lucide-svelte'
	import { buildTreeNodes, type TreeNode } from './buildTree'
	import { useSelected } from '$lib/hooks/useSelection.svelte'
	import { provideTreeExpandedContext } from './useExpanded.svelte'
	import { isEqual } from 'lodash-es'
	import { useObjects } from '$lib/hooks/useObjects.svelte'
	import Settings from './Settings.svelte'

	const showTreeview = new PersistedState('show-treeview', true)

	provideTreeExpandedContext()

	const selected = useSelected()
	const objects = useObjects()

	let rootNode = $state<TreeNode>({
		id: 'world',
		name: 'World',
		children: [],
		href: '/',
	})

	const nodes = $derived(buildTreeNodes(objects.current))

	$effect.pre(() => {
		if (!isEqual(rootNode.children, nodes)) {
			rootNode.children = nodes
		}
	})
</script>

<svelte:window
	onkeydown={({ key }) => {
		if (key === Keybindings.TREEVIEW) {
			showTreeview.current = !showTreeview.current
		}
	}}
/>

<button
	class="fixed top-2 left-2 p-2"
	onclick={() => (showTreeview.current = !showTreeview.current)}
>
	<ListTree />
</button>

{#if showTreeview.current}
	<div
		class="bg-extralight border-medium fixed top-0 left-0 m-2 overflow-y-auto border text-xs"
		in:fly={{ duration: 250, x: -100 }}
		out:fly={{ duration: 250, x: -100 }}
	>
		{#key rootNode}
			<Tree
				{rootNode}
				selections={selected.current ? [selected.current] : []}
				onSelectionChange={(event) => {
					selected.set(event.selectedValue[0])
				}}
			/>
		{/key}

		<Settings />
	</div>
{/if}
