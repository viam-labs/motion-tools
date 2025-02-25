<script lang="ts">
	import { T } from '@threlte/core'
	import { useFocus } from '$lib/hooks/useSelection.svelte'
	import { Keybindings } from '$lib/keybindings'

	const focus = useFocus()

	$effect(() => console.log(focus.current))
</script>

<svelte:window
	onkeydown={({ key }) => {
		if (key === Keybindings.ESCAPE) {
			focus.set(undefined)
		}
	}}
/>

{#if focus.current}
	<T
		is={focus.current}
		position={[0, 0, 0]}
	/>
{/if}
