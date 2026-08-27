<script lang="ts">
	import { type Entity, IsExcluded } from 'koota'

	import FloatingPanel from '$lib/components/overlay/FloatingPanel.svelte'
	import { traits, useWorld } from '$lib/ecs'

	import type { TreeNode } from './buildTree'

	import PoseStalenessIndicator from './PoseStalenessIndicator.svelte'
	import Tree from './Tree.svelte'
	import { useTree } from './useTree.svelte'

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
	{#snippet headerSuffix()}
		<PoseStalenessIndicator />
	{/snippet}

	<Tree
		{rootNode}
		parents={tree.parents}
		onSelectionChange={(event) => {
			const next = new Set(event.selectedValue.map(Number))

			for (const entity of world.query(traits.Selected)) {
				if (!next.has(entity as number)) entity.remove(traits.Selected)
			}

			for (const id of next) {
				const entity = id as Entity
				// Folder rows and the `World` root are `IsExcluded`, so they never come
				// back out of the `Selected` query — selecting one would clear the
				// user's real selection on the next round trip.
				if (entity.has(IsExcluded)) continue
				if (!entity.has(traits.Selected)) entity.add(traits.Selected)
			}
		}}
	/>
</FloatingPanel>
