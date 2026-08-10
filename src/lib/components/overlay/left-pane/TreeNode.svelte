<script lang="ts">
	import type { Api } from '@zag-js/tree-view'

	import { ChevronRight, Eye, EyeOff } from 'lucide-svelte'
	import { VirtualList } from 'svelte-virtuallists'

	import { traits, useTrait } from '$lib/ecs'

	import type { TreeNode } from './useTree.svelte'

	import Self from './TreeNode.svelte'

	interface Props {
		node: TreeNode
		indexPath: number[]
		api: Api
	}

	let { node, indexPath, api }: Props = $props()

	const name = useTrait(() => node.entity, traits.Name)
	const invisible = useTrait(() => node.entity, traits.Invisible)
	const inheritedInvisible = useTrait(() => node.entity, traits.InheritedInvisible)
	const chunkProgress = useTrait(() => node.entity, traits.ChunkProgress)
	const loading = $derived(chunkProgress.current !== undefined)
	const progress = $derived(
		chunkProgress.current && chunkProgress.current.total > 0
			? chunkProgress.current.loaded / chunkProgress.current.total
			: 0
	)

	const nodeProps = $derived({ indexPath, node })
	const nodeState = $derived(api.getNodeState(nodeProps))

	/**
	 * Every row is as wide as the widest row in the tree, so the fill has to be
	 * opaque: the action column is pinned to the viewport and the name scrolls
	 * behind it.
	 */
	const rowClass = $derived([
		nodeState.selected ? 'bg-medium' : 'bg-white hover:bg-light',
		inheritedInvisible.current && 'text-disabled',
	])
</script>

{#snippet actions()}
	<!--
		Sticks to the trailing edge of the scroll port so the visibility toggle stays
		reachable however deeply the row is indented. `bg-inherit` picks up whichever
		row fill is in play (default, hover, selected) to mask the name behind it.
	-->
	<div class="sticky right-0 flex items-center gap-1 bg-inherit pr-4 pl-2">
		{#if loading}
			<span
				role="progressbar"
				aria-label="Loading {Math.round(progress * 100)}%"
				aria-valuenow={Math.round(progress * 100)}
				aria-valuemin={0}
				aria-valuemax={100}
				class="border-gray-6 size-3 rounded-full border"
				style:background="conic-gradient(var(--color-gray-6, #9c9ca4) {progress * 100}%, transparent {progress *
					100}%)"
			></span>
		{/if}

		<button
			type="button"
			class="text-gray-6"
			onclick={(event) => {
				event.stopPropagation()

				if (node.entity.has(traits.Invisible)) {
					node.entity.remove(traits.Invisible)
				} else {
					node.entity.add(traits.Invisible)
				}
			}}
		>
			{#if invisible.current}
				<EyeOff size={14} />
			{:else}
				<Eye size={14} />
			{/if}
		</button>
	</div>
{/snippet}

{#if nodeState.isBranch}
	{@const { expanded } = nodeState}
	{@const { children = [] } = node}
	<div {...api.getBranchProps(nodeProps)}>
		<div
			{...api.getBranchControlProps(nodeProps)}
			class={rowClass}
		>
			<button
				type="button"
				aria-label={expanded ? 'Collapse' : 'Expand'}
				{...api.getBranchTriggerProps(nodeProps)}
				class={['flex shrink-0 items-center', { 'rotate-90': expanded }]}
			>
				<ChevronRight size={14} />
			</button>
			<span
				class="flex items-center"
				{...api.getBranchTextProps(nodeProps)}
			>
				{name.current}
			</span>

			{@render actions()}
		</div>
		<div {...api.getBranchContentProps(nodeProps)}>
			<div {...api.getBranchIndentGuideProps(nodeProps)}></div>

			{#if children.length > 200}
				<VirtualList
					style="height:{Math.min(8, Math.max(children.length, 5)) * 32}px;"
					items={children}
				>
					{#snippet vl_slot({ index, item: node })}
						<Self
							{node}
							indexPath={[...indexPath, Number(index)]}
							{api}
						/>
					{/snippet}
				</VirtualList>
			{:else}
				{#each children as node, index (node.entity)}
					<Self
						{node}
						indexPath={[...indexPath, Number(index)]}
						{api}
					/>
				{/each}
			{/if}
		</div>
	</div>
{:else}
	<div
		{...api.getItemProps(nodeProps)}
		class={rowClass}
	>
		<span
			class="flex items-center gap-1.5"
			{...api.getItemTextProps(nodeProps)}
		>
			{name.current}
		</span>

		{@render actions()}
	</div>
{/if}

<style>
	:global(:root) {
		/*
		 * The indent step, declared on every part that reads it — the guides sit in
		 * a sibling subtree, so they can't inherit it from a row.
		 */
		[data-scope='tree-view'][data-part='item'],
		[data-scope='tree-view'][data-part='branch-control'],
		[data-scope='tree-view'][data-part='branch-indent-guide'] {
			--padding-inline: 16px;
		}

		[data-scope='tree-view'][data-part='item'],
		[data-scope='tree-view'][data-part='branch-control'] {
			user-select: none;
			padding-inline-start: calc(var(--depth) * var(--padding-inline));
			display: flex;
			align-items: center;
			gap: 8px;
			min-height: 32px;
		}

		/*
		 * Grow so the action column sits at the trailing edge of the row, never
		 * shrink so a long or deeply indented name widens the tree's scroll area
		 * instead of wrapping onto a second line.
		 */
		[data-scope='tree-view'][data-part='item-text'],
		[data-scope='tree-view'][data-part='branch-text'] {
			flex: 1 0 auto;
			white-space: nowrap;
		}

		[data-scope='tree-view'][data-part='branch-content'] {
			position: relative;
			isolation: isolate;
		}

		/*
		 * Centered under the parent's 14px chevron. No z-index: the guides span the
		 * full height of their subtree, so lifting them would draw hairlines across
		 * the pinned action column of every descendant row.
		 */
		[data-scope='tree-view'][data-part='branch-indent-guide'] {
			position: absolute;
			border-left: 1px solid var(--color-gray-3);
			height: 100%;
			translate: calc(var(--depth) * var(--padding-inline) + 7px);
		}
	}
</style>
