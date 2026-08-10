<script lang="ts">
	import type { Entity } from 'koota'

	import { normalizeProps, useMachine } from '@zag-js/svelte'
	import * as tree from '@zag-js/tree-view'
	import { VirtualList } from 'svelte-virtuallists'
	import { SvelteSet } from 'svelte/reactivity'

	import { relations, traits, useQuery } from '$lib/ecs'

	import type { TreeNode as TreeNodeType } from './useTree.svelte'

	import TreeNode from './TreeNode.svelte'

	interface Props {
		rootNode: TreeNodeType
		dragElement?: HTMLElement
		onSelectionChange?: (event: tree.SelectionChangeDetails) => void
	}

	let { rootNode, onSelectionChange, dragElement = $bindable() }: Props = $props()

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
			let ancestor: Entity | undefined = entity.targetFor(relations.ChildOf)
			while (ancestor) {
				expandedValues.add(`${ancestor}`)
				ancestor = ancestor.targetFor(relations.ChildOf)
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

	$effect(() => {
		const value = selected.current.at(-1)
		if (value === undefined) return

		const frame = requestAnimationFrame(() => {
			const row = document.querySelector(`[data-scope="tree-view"][data-value="${value}"]`)

			// Rows span the full scroll width, so scrolling one into view can never
			// reveal a deeply indented name. Aim at the label instead.
			const label = row?.querySelector('[data-part="item-text"], [data-part="branch-text"]')
			const target = label ?? row

			target?.scrollIntoView({ block: 'nearest', inline: 'nearest' })
		})

		return () => cancelAnimationFrame(frame)
	})
</script>

<div
	{...api.getRootProps()}
	class="h-full scrollbar-thin overflow-auto text-xs"
>
	<!--
		Sized to the widest row instead of the panel, so deep nesting scrolls
		horizontally rather than wrapping; `min-w-full` keeps rows full width (and
		with them the hover and selection fills) when the tree is shallow.
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
	 * `:global` because the track belongs to VirtualList; the rule lives here
	 * because only this component renders an ancestor it can hang off.
	 */
	[data-part='tree'] :global(.vtlist-inner) {
		width: max-content;
		min-width: 100%;
	}
</style>
