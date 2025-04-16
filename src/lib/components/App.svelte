<script lang="ts">
	import type { Snippet } from 'svelte'
	import { Canvas } from '@threlte/core'
	import { XRButton } from '@threlte/xr'
	import Scene from './Scene.svelte'
	import TreeContainer from '$lib/components/Tree/TreeContainer.svelte'
	import Logs from '$lib/components/Logs.svelte'
	import Details from '$lib/components/Details.svelte'
	import { ChevronLeft } from 'lucide-svelte'
	import { provideFrames } from '$lib/hooks/useFrames.svelte'
	import { provideGeometries } from '$lib/hooks/useGeometries.svelte'
	import { providePointclouds } from '$lib/hooks/usePointclouds.svelte'
	import { providePoses } from '$lib/hooks/usePoses.svelte'
	import { usePartID } from '$lib/hooks/usePartID.svelte'
	import { provideSelection } from '$lib/hooks/useSelection.svelte'
	import { provideStaticGeometries } from '$lib/hooks/useStaticGeometries.svelte'
	import { provideVisibility } from '$lib/hooks/useVisibility.svelte'
	import { provideShapes } from '$lib/hooks/useShapes.svelte'
	import { providePollingRates } from '$lib/hooks/usePollingRates.svelte'

	interface Props {
		children?: Snippet
	}

	let { children }: Props = $props()

	const partID = usePartID()

	provideStaticGeometries()
	provideVisibility()
	provideShapes()
	providePollingRates()

	providePoses(() => partID.current)
	provideGeometries(() => partID.current)
	providePointclouds(() => partID.current)
	provideFrames(() => partID.current)

	const { focus } = provideSelection()
</script>

<Canvas renderMode="always">
	<Scene>
		{@render children?.()}
	</Scene>
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
