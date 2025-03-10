<script lang="ts">
	import { PersistedState } from 'runed'
	import Tree from './Tree.svelte'
	import { fly } from 'svelte/transition'
	import { Keybindings } from '$lib/keybindings'
	import { ListTree } from 'lucide-svelte'
	import { useFrames } from '$lib/hooks/useFrames.svelte'
	import { buildTreeNodes } from '$lib/buildTree'
	import { useGeometries } from '$lib/hooks/useGeometries.svelte'
	import { usePointClouds } from '$lib/hooks/usePointclouds.svelte'
	import { useSelection } from '$lib/hooks/useSelection.svelte'
	import { useStaticGeometries } from '$lib/hooks/useStaticGeometries.svelte'
	import { useShapes } from '$lib/hooks/useWebsocketClient.svelte'

	const showTreeview = new PersistedState('show-treeview', false)

	const selection = useSelection()
	const frames = useFrames()
	const geometries = useGeometries()
	const statics = useStaticGeometries()
	const shapes = useShapes()
	const pcds = usePointClouds()
	const clouds1 = $derived(
		pcds.current.map(({ name, userData }) => ({ name, parent: userData.parent ?? 'world' }))
	)
	const clouds2 = $derived(shapes.points.map(({ name }) => ({ name, parent: 'world' })))
	const objects = $derived([
		...frames.current,
		...geometries.current,
		...statics.current,
		...shapes.current,
		...clouds1,
		...clouds2,
	])
	const rootNode = $derived(buildTreeNodes(objects))
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
		class="fixed top-0 left-0 m-2 rounded-md bg-gray-100 p-2 text-xs"
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
	</div>
{/if}
