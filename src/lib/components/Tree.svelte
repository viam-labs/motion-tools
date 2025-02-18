<script lang="ts">
	import * as tree from '@zag-js/tree-view'
	import { useMachine, normalizeProps } from '@zag-js/svelte'

	interface Node {
		id: string
		name: string
		children?: Node[]
	}

	const collection = tree.collection<Node>({
		nodeToValue: (node) => node.id,
		nodeToString: (node) => node.name,
		rootNode: {
			id: 'ROOT',
			name: '',
			children: [
				{
					id: 'node_modules',
					name: 'node_modules',
					children: [
						{ id: 'node_modules/zag-js', name: 'zag-js' },
						{ id: 'node_modules/pandacss', name: 'panda' },
						{
							id: 'node_modules/@types',
							name: '@types',
							children: [
								{ id: 'node_modules/@types/react', name: 'react' },
								{ id: 'node_modules/@types/react-dom', name: 'react-dom' },
							],
						},
					],
				},
			],
		},
	})

	const [state, send] = useMachine(tree.machine({ id: '1', collection }), {
		context: {
			expandOnClick: true,
			selectionMode: 'single',
		},
	})
	const api = tree.connect(state, send, normalizeProps)
</script>

{#snippet treeNode({ node, indexPath, api }: { node: Node; indexPath: number[]; api: tree.Api })}
	{@const nodeProps = { indexPath, node }}
	{@const nodeState = api.getNodeState(nodeProps)}

	{#if nodeState.isBranch}
		<div {...api.getBranchProps(nodeProps)}>
			<div {...api.getBranchControlProps(nodeProps)}>
				<!-- <LuFolder /> -->
				<span {...api.getBranchTextProps(nodeProps)}>{node.name}</span>
				<span {...api.getBranchIndicatorProps(nodeProps)}>
					<!-- <LuChevronRight /> -->
				</span>
			</div>
			<div {...api.getBranchContentProps(nodeProps)}>
				<div {...api.getBranchIndentGuideProps(nodeProps)}></div>
				{#each node.children ?? [] as childNode, index}
					{@render treeNode({ node: childNode, indexPath: [...indexPath, index], api })}
				{/each}
			</div>
		</div>
	{:else}
		<div {...api.getItemProps(nodeProps)}>
			<!-- <LuFile />  -->
			{node.name}
		</div>
	{/if}
{/snippet}

<div class="root-node fixed top-0 left-0">
	<div {...api.getRootProps()}>
		<h3 {...api.getLabelProps()}>My Documents</h3>

		<div class="flex gap-2">
			<button
				class="treeview-trigger"
				onclick={() => api.collapse()}
			>
				Collapse All
			</button>

			<button
				class="treeview-trigger"
				onclick={() => api.expand()}
			>
				Expand All
			</button>
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
			margin-top: 20px;
			width: 240px;
			margin-left: -16px;
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
			border-radius: 2px;
			min-height: 32px;

			& svg {
				width: 16px;
				height: 16px;
				opacity: 0.5;
			}

			&:hover {
				background: var(--colors-border-bold);
			}

			&[data-selected] {
				background: var(--colors-bg-primary-bold);
				color: var(--colors-text-inverse);
			}
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

		[data-scope='tree-view'][data-part='branch-indicator'] {
			display: flex;
			align-items: center;
			&[data-state='open'] svg {
				transform: rotate(90deg);
			}
		}
	}
</style>
