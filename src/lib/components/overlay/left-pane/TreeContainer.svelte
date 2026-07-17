<script lang="ts">
	import { type Entity, IsExcluded } from 'koota'

	import { traits, useWorld } from '$lib/ecs'

	import FloatingPanel from '../FloatingPanel.svelte'
	import Tree from './Tree.svelte'
	import { provideTreeExpandedContext } from './useExpanded.svelte'
	import { type TreeNode, useTree } from './useTree.svelte'

	provideTreeExpandedContext()

	const world = useWorld()

	const worldEntity = world.spawn(IsExcluded, traits.Name('World'))

	const tree = useTree()

	const rootNode = $derived<TreeNode>({
		entity: worldEntity,
		children: tree.current,
	})
</script>

<FloatingPanel
	isOpen
	defaultPosition={{ x: 10, y: 48 }}
	defaultSize={{ width: 240, height: 400 }}
	title="World"
	exitable={false}
	resizable
>
	<Tree
		{rootNode}
		onSelectionChange={(event) => {
			const next = new Set(event.selectedValue.map(Number))

			for (const entity of world.query(traits.Selected)) {
				if (!next.has(entity as number)) entity.remove(traits.Selected)
			}

			for (const id of next) {
				const entity = id as Entity
				if (!entity.has(traits.Selected)) entity.add(traits.Selected)
			}
		}}
	/>
</FloatingPanel>
