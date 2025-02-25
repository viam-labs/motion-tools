<script lang="ts">
	import { PersistedState } from 'runed'
	import Tree from './Tree.svelte'
	import { fly } from 'svelte/transition'
	import { Keybindings } from '$lib/keybindings'
	import { ListTree } from 'lucide-svelte'

	Keybindings

	const showTreeview = new PersistedState('show-treeview', false)
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
		class="fixed top-0 left-0 m-2 bg-black p-2 text-xs text-white"
		in:fly={{ duration: 250, x: -100 }}
		out:fly={{ duration: 250, x: -100 }}
	>
		<Tree />
	</div>
{/if}
