<script lang="ts">
	import { Canvas } from '@threlte/core'
	import { XRButton } from '@threlte/xr'
	import Scene from './Scene.svelte'
	import TreeContainer from '$lib/components/TreeContainer.svelte'
	import Logs from '$lib/components/Logs.svelte'
	import { useFocus } from '$lib/hooks/useSelection.svelte'
	import Details from '$lib/components/Details.svelte'
	import { ChevronLeft } from 'lucide-svelte'

	const focus = useFocus()
</script>

<Canvas renderMode="always">
	<Scene />
</Canvas>

<Details />

{#if focus.current === undefined}
	<TreeContainer />
	<Logs />
{:else}
	<button
		class="fixed top-0 left-0 p-2"
		onclick={() => focus.set(undefined)}
	>
		<ChevronLeft />
	</button>
{/if}

{#if false}
	<XRButton mode="immersive-ar" />
{/if}
