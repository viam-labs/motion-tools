<script lang="ts">
	import { PersistedState } from 'runed'
	import Tree from './Tree.svelte'
	import { fly } from 'svelte/transition'
	import { Keybindings } from '$lib/keybindings'
	import { ListTree } from 'lucide-svelte'
	import { buildTreeNodes, type TreeNode } from './buildTree'
	import { Icon } from '@viamrobotics/prime-core'
	import { useSelected } from '$lib/hooks/useSelection.svelte'
	import { provideTreeExpandedContext } from './useExpanded.svelte'
	import { isEqual } from 'lodash-es'
	import RefreshRate from '../RefreshRate.svelte'
	import { useObjects } from '$lib/hooks/useObjects.svelte'

	const showTreeview = new PersistedState('show-treeview', true)
	const showSettings = new PersistedState('show-settings', false)

	provideTreeExpandedContext()

	const selected = useSelected()
	const objects = useObjects()

	let rootNode = $state<TreeNode>({
		id: 'world',
		name: 'World',
		children: [],
		href: '/',
	})

	$effect.pre(() => {
		const nextNodes = buildTreeNodes(objects.current)

		if (!isEqual(rootNode.children, nextNodes)) {
			rootNode.children = nextNodes
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

		<button
			class="border-medium w-full border-t p-2 text-left"
			onclick={() => (showSettings.current = !showSettings.current)}
		>
			<h3 class="text-default flex items-center gap-1.5">
				<Icon
					name={showSettings.current ? 'unfold-more-horizontal' : 'unfold-less-horizontal'}
					label="unfold more icon"
					variant="ghost"
					cx="size-6"
					on:click={() => (showSettings.current = !showSettings.current)}
				/>
				Settings
			</h3>
		</button>

		{#if showSettings.current}
			<div class="border-medium flex flex-col gap-2 border-t p-3">
				<RefreshRate name="Pointclouds" />
				<RefreshRate name="Geometries" />
				<RefreshRate name="Poses" />
			</div>
		{/if}
	</div>
{/if}
