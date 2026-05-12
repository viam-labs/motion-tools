<script lang="ts">
	import { type Entity, IsExcluded } from 'koota'

	import { traits, useWorld } from '$lib/ecs'
	import { useSelectedEntity } from '$lib/hooks/useSelection.svelte'

	import FloatingPanel from '../FloatingPanel.svelte'
	import Tree from './Tree.svelte'
	import { provideTreeExpandedContext } from './useExpanded.svelte'
	import { type TreeNode, useTree } from './useTree.svelte'

	provideTreeExpandedContext()

	const selectedEntity = useSelectedEntity()
	const world = useWorld()

	const worldEntity = world.spawn(IsExcluded, traits.Name('World'))

	const tree = useTree()

	const rootNode = $derived<TreeNode>({
		entity: worldEntity,
		children: tree.current.rootNodes,
	})
</script>

<FloatingPanel
	isOpen
	defaultPosition={{ x: 10, y: 10 }}
	defaultSize={{ width: 240, height: 400 }}
	title="World"
	exitable={false}
	resizable
>
	<Tree
		{rootNode}
		nodeMap={tree.current.nodeMap}
		onSelectionChange={(event) => {
			const value = event.selectedValue[0]

			selectedEntity.set(value ? (Number(value) as Entity) : undefined)
		}}
	/>
</FloatingPanel>
