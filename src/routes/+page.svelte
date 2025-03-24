<script lang="ts">
	import { Canvas } from '@threlte/core'
	import { XRButton } from '@threlte/xr'
	import Scene from './Scene.svelte'
	import TreeContainer from '$lib/components/TreeContainer.svelte'
	import Logs from '$lib/components/Logs.svelte'
	import Details from '$lib/components/Details.svelte'
	import { ChevronLeft } from 'lucide-svelte'
	import { provideFrames } from '$lib/hooks/useFrames.svelte'
	import { provideGeometries } from '$lib/hooks/useGeometries.svelte'
	import { providePointclouds } from '$lib/hooks/usePointclouds.svelte'
	import { providePoses } from '$lib/hooks/usePoses.svelte'
	import { usePartID } from '$lib/hooks/usePartID.svelte'
	import { provideSelection } from '$lib/hooks/useSelection.svelte'

	const partID = usePartID()

	providePoses(() => partID.current)
	provideGeometries(() => partID.current)
	providePointclouds(() => partID.current)
	provideFrames(() => partID.current)

	const { focus } = provideSelection()
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
