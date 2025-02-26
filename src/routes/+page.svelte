<script lang="ts">
	import { Canvas } from '@threlte/core'
	import Scene from './Scene.svelte'
	import TreeContainer from '$lib/components/TreeContainer.svelte'
	import Logs from '$lib/components/Logs.svelte'
	import { useFocus } from '$lib/hooks/useSelection.svelte'

	const focus = useFocus()
</script>

<Canvas renderMode="always">
	<Scene />
</Canvas>

{#if focus.current === undefined}
	<TreeContainer />
	<Logs />
{/if}
