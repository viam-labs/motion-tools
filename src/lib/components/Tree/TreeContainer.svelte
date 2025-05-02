<script lang="ts">
	import { PersistedState } from 'runed'
	import Tree from './Tree.svelte'
	import { fly } from 'svelte/transition'
	import { Keybindings } from '$lib/keybindings'
	import { ListTree } from 'lucide-svelte'
	import { buildTreeNodes, type TreeNode } from './buildTree'

	import { useSelection } from '$lib/hooks/useSelection.svelte'
	import { provideTreeExpandedContext } from './useExpanded.svelte'
	import { isEqual } from 'lodash-es'
	import RefreshRate from '../RefreshRate.svelte'
	import { useShapes } from '$lib/hooks/useShapes.svelte'
	import { useObjects } from '$lib/hooks/useObjects.svelte'

	const showTreeview = new PersistedState('show-treeview', true)
	const showSettings = new PersistedState('show-settings', false)

	provideTreeExpandedContext()

	const selection = useSelection()
	const objects = useObjects()
	const shapes = useShapes()

	let rootNode = $state<TreeNode>({
		id: 'world',
		name: 'World',
		children: [],
		href: '/',
	})

	$effect.pre(() => {
		const nextNodes = buildTreeNodes(objects.current)
		const poseNodes = buildTreeNodes(shapes.poses)

		if (poseNodes.length > 0) {
			const poseRoot = {
				id: 'poses',
				name: 'Poses',
				children: poseNodes,
				href: '/',
			}

			nextNodes.push(poseRoot)
		}

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
	class="fixed top-0 left-0 p-2"
	onclick={() => (showTreeview.current = !showTreeview.current)}
>
	<ListTree />
</button>

{#if showTreeview.current}
	<div
		class="bg-extralight border-medium fixed top-0 left-0 m-2 max-h-1/2 overflow-y-auto border text-xs"
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

		<button
			class="border-medium w-full border-t border-b p-2 text-left"
			onclick={() => (showSettings.current = !showSettings.current)}
		>
			<h3>Settings</h3>
		</button>

		{#if showSettings.current}
			<div class="flex flex-col gap-1.5 p-2">
				<RefreshRate name="Pointclouds" />
				<RefreshRate name="Geometries" />
				<RefreshRate name="Poses" />
			</div>
		{/if}
	</div>
{/if}
