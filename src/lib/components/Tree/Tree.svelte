<script lang="ts">
	import * as tree from '@zag-js/tree-view'
	import { useMachine, normalizeProps } from '@zag-js/svelte'
	import { untrack } from 'svelte'
	import { ChevronRight, Eye, EyeOff } from 'lucide-svelte'
	import { useVisibility } from '$lib/hooks/useVisibility.svelte'
	import type { TreeNode } from './buildTree'
	import { useExpanded } from './useExpanded.svelte'

	const visibility = useVisibility()
	const expanded = useExpanded()

	interface Props {
		rootNode: TreeNode
		selections: string[]
		onSelectionChange?: (event: tree.SelectionChangeDetails) => void
	}

	let { rootNode, selections, onSelectionChange }: Props = $props()

	const collection = tree.collection<TreeNode>({
		nodeToValue: (node) => node.id,
		nodeToString: (node) => node.name,
		rootNode,
	})

	const service = useMachine(tree.machine, {
		collection,
		onSelectionChange(details) {
			onSelectionChange?.(details)
		},
		onExpandedChange(details) {
			expanded.clear()
			for (const value of details.expandedValue) {
				expanded.add(value)
			}
		},
	})

	const api = $derived(tree.connect(service, normalizeProps))

	$effect(() => {
		untrack(() => api).setSelectedValue(selections)
	})

	$effect(() => {
		untrack(() => api).setExpandedValue([...expanded])
	})
</script>

{#snippet treeNode({
	node,
	indexPath,
	api,
}: {
	node: TreeNode
	indexPath: number[]
	api: tree.Api
})}
	{@const nodeProps = { indexPath, node }}
	{@const nodeState = api.getNodeState(nodeProps)}
	{@const isVisible = visibility.get(node.name) ?? true}
	{@const { selected } = nodeState}

	{#if nodeState.isBranch}
		{@const { expanded } = nodeState}
		<div
			{...api.getBranchProps(nodeProps)}
			class={{ 'text-disabled': !isVisible, 'bg-medium': selected }}
		>
			<div {...api.getBranchControlProps(nodeProps)}>
				<span
					{...api.getBranchIndicatorProps(nodeProps)}
					class={{ 'rotate-90': expanded }}
				>
					<ChevronRight size={14} />
				</span>
				<span
					class="flex items-center"
					{...api.getBranchTextProps(nodeProps)}
				>
					{node.name}
				</span>

				<button
					onclick={(event) => {
						event.stopPropagation()
						visibility.set(node.name, !isVisible)
					}}
				>
					{#if isVisible}
						<Eye size={14} />
					{:else}
						<EyeOff size={14} />
					{/if}
				</button>
			</div>
			<div {...api.getBranchContentProps(nodeProps)}>
				<div {...api.getBranchIndentGuideProps(nodeProps)}></div>
				{#each node.children ?? [] as childNode, index}
					{@render treeNode({ node: childNode, indexPath: [...indexPath, index], api })}
				{/each}
			</div>
		</div>
	{:else}
		<div
			class={{ 'flex justify-between': true, 'text-disabled': !isVisible, 'bg-medium': selected }}
			{...api.getItemProps(nodeProps)}
		>
			<span class="flex items-center gap-1.5">
				{node.name}
			</span>

			<button
				onclick={(event) => {
					event.stopPropagation()
					visibility.set(node.name, !isVisible)
				}}
			>
				{#if isVisible}
					<Eye size={14} />
				{:else}
					<EyeOff size={14} />
				{/if}
			</button>
		</div>
	{/if}
{/snippet}

<div class="root-node">
	<div {...api.getRootProps()}>
		<div class="border-medium border-b p-2">
			<h3 {...api.getLabelProps()}>{rootNode.name}</h3>
		</div>

		<div {...api.getTreeProps()}>
			{#each collection.rootNode.children ?? [] as node, index}
				{@render treeNode({ node, indexPath: [index], api })}
			{/each}
		</div>
	</div>
</div>

<style>
	.root-node {
		--colors-bg-subtle: #ffffff;
		--colors-bg-bold: #edf2f7;
		--colors-bg-primary-subtle: #38a169;
		--colors-bg-primary-bold: #2f855a;
		--colors-bg-secondary-subtle: #000000;
		--colors-bg-secondary-bold: #2d3748;
		--colors-bg-tertiary-bold: #c6f6d5;
		--colors-bg-tertiary-subtle: #f0fff4;
		--colors-bg-code-block: hsl(230, 1%, 98%);
		--colors-bg-code-inline: rgba(0, 0, 0, 0.04);
		--colors-bg-header: rgba(255, 255, 255, 0.92);
		--colors-bg-badge: #feebc8;
		--colors-text-bold: #171923;
		--colors-text-subtle: #4a5568;
		--colors-text-primary-bold: #38a169;
		--colors-text-inverse: #ffffff;
		--colors-text-primary-subtle: #2f855a;
		--colors-text-badge: #c05621;
		--colors-border-subtle: #edf2f7;
		--colors-border-bold: #e2e8f0;
		--colors-border-primary-subtle: #38a169;
		--colors-border-primary-bold: #2f855a;
	}

	:global(:root) {
		[data-scope='tree-view'][data-part='tree'] {
			width: 240px;
		}

		[data-scope='tree-view'][data-part='label'] {
			font-weight: 500;
		}

		[data-scope='tree-view'][data-part='item'],
		[data-scope='tree-view'][data-part='branch-control'] {
			user-select: none;
			--padding-inline: 16px;
			padding-inline-start: calc(var(--depth) * var(--padding-inline));
			padding-inline-end: var(--padding-inline);
			display: flex;
			align-items: center;
			gap: 8px;
			min-height: 32px;
		}

		[data-scope='tree-view'][data-part='item-text'],
		[data-scope='tree-view'][data-part='branch-text'] {
			flex: 1;
		}

		[data-scope='tree-view'][data-part='branch-content'] {
			position: relative;
			isolation: isolate;
		}

		[data-scope='tree-view'][data-part='branch-indent-guide'] {
			position: absolute;
			content: '';
			border-left: 1px solid rgba(226, 226, 226, 0.179);
			height: 100%;
			translate: calc(var(--depth) * 1.25rem);
			z-index: 0;
		}
	}
</style>
