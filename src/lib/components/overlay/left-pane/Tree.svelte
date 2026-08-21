<script lang="ts">
	import { normalizeProps, useMachine } from '@zag-js/svelte'
	import * as tree from '@zag-js/tree-view'
	import { VirtualList } from 'svelte-virtuallists'
	import { SvelteSet } from 'svelte/reactivity'

	import { traits, useQuery } from '$lib/ecs'

	import type { TreeNode as TreeNodeType } from './buildTree'

	import TreeNode from './TreeNode.svelte'

	interface Props {
		rootNode: TreeNodeType
		/** Child value to parent value, following drawn edges rather than `ChildOf`. */
		parents: Map<string, string>
		dragElement?: HTMLElement
		onSelectionChange?: (event: tree.SelectionChangeDetails) => void
	}

	let { rootNode, parents, onSelectionChange, dragElement = $bindable() }: Props = $props()

	const collection = $derived(
		tree.collection<TreeNodeType>({
			nodeToValue: (node) => `${node.entity}`,
			nodeToString: (node) => node.entity.get(traits.Name) ?? '',
			rootNode,
		})
	)

	const selected = useQuery(traits.Selected)

	const selectedValue = $derived(selected.current.map((entity) => `${entity}`))
	const expandedValues = new SvelteSet<string>()

	$effect(() => {
		for (const entity of selected.current) {
			let ancestor = parents.get(`${entity}`)
			while (ancestor) {
				expandedValues.add(ancestor)
				ancestor = parents.get(ancestor)
			}
		}
	})

	const id = $props.id()
	const service = useMachine(tree.machine, () => ({
		id,
		collection,
		selectionMode: 'multiple' as const,
		expandOnClick: false,
		selectedValue,
		expandedValue: [...expandedValues],
		onSelectionChange(details) {
			onSelectionChange?.(details)
		},
		onExpandedChange(details) {
			expandedValues.clear()
			for (const value of details.expandedValue) {
				expandedValues.add(value)
			}
		},
	}))

	const api = $derived(tree.connect(service, normalizeProps))
	const rootChildren = $derived(collection.rootNode.children ?? [])

	const openedFolders = new Set<string>()

	// Seeded once per folder, so a folder the user collapsed stays collapsed.
	// `.pre` lands the value before the first commit, otherwise every folder
	// renders collapsed for a frame and then pops open.
	$effect.pre(() => {
		for (const node of rootChildren) {
			if (!node.isFolder) continue

			const value = `${node.entity}`
			if (openedFolders.has(value)) continue

			openedFolders.add(value)
			expandedValues.add(value)
		}
	})

	let scroller: HTMLElement | undefined = $state()

	$effect(() => {
		const value = selected.current.at(-1)
		if (value === undefined || !scroller) return

		const port = scroller

		const frame = requestAnimationFrame(() => {
			const row = port.querySelector(`[data-scope="tree-view"][data-value="${value}"]`)
			if (!(row instanceof HTMLElement)) return

			// Vertical only. Rows are `w-max min-w-full` and labels `flex: 1 0 auto`, so
			// letting `scrollIntoView` touch the inline axis drags the port back to the
			// name's start on every selection.
			const left = port.scrollLeft
			row.scrollIntoView({ block: 'nearest', inline: 'nearest' })
			port.scrollLeft = left

			// A deeply indented name can still sit past the right edge, so nudge the
			// inline axis by hand, and only when the name is actually out of view.
			const label = row.querySelector('[data-part="item-text"], [data-part="branch-text"]')
			if (!(label instanceof HTMLElement)) return

			const nameLeft = label.getBoundingClientRect().left
			const view = port.getBoundingClientRect()
			if (nameLeft < view.left || nameLeft > view.right) {
				port.scrollLeft += nameLeft - view.left
			}
		})

		return () => cancelAnimationFrame(frame)
	})
</script>

<div
	{...api.getRootProps()}
	bind:this={scroller}
	class="h-full scrollbar-thin overflow-auto text-xs"
>
	<!--
		Sized to the widest row instead of the panel, so deep nesting scrolls
		horizontally rather than wrapping. `min-w-full` keeps rows full width, and
		with them the hover and selection fills, when the tree is shallow.
	-->
	<div
		{...api.getTreeProps()}
		class="w-max min-w-full"
	>
		{#if rootChildren.length === 0}
			<p class="text-subtle-2 px-2 py-4">No objects displayed</p>
		{:else if rootChildren.length > 200}
			<VirtualList items={rootChildren}>
				{#snippet vl_slot({ index, item: node })}
					<TreeNode
						{node}
						indexPath={[Number(index)]}
						{api}
					/>
				{/snippet}
			</VirtualList>
		{:else}
			{#each rootChildren as node, index (node.entity)}
				<TreeNode
					{node}
					indexPath={[Number(index)]}
					{api}
				/>
			{/each}
		{/if}
	</div>
</div>

<style>
	/*
	 * svelte-virtuallists stretches its track to its own scroll port, which would
	 * clamp rows back to the panel width. Let it grow with the rows instead, so
	 * names in a virtualized branch scroll horizontally like every other row.
	 * `:global` because the track belongs to VirtualList. The rule lives here
	 * because only this component renders an ancestor it can hang off.
	 */
	[data-part='tree'] :global(.vtlist-inner) {
		width: max-content;
		min-width: 100%;
	}
</style>
