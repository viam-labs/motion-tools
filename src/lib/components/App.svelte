<script lang="ts">
	import type { Snippet } from 'svelte'
	import { Canvas } from '@threlte/core'
	import { XRButton } from '@threlte/xr'
	import Scene from './Scene.svelte'
	import TreeContainer from '$lib/components/Tree/TreeContainer.svelte'
	import Details from '$lib/components/Details.svelte'
	import SceneProviders from './SceneProviders.svelte'
	import DomPortal from './DomPortal.svelte'
	import { PersistedState } from 'runed'
	import XR from '$lib/components/xr/XR.svelte'
	import { World } from '@threlte/rapier'
	import { createPartIDContext } from '$lib/hooks/usePartID.svelte'
	import Dashboard from './dashboard/Dashboard.svelte'

	interface Props {
		partID?: string
		children?: Snippet
	}

	let { partID = '', children: appChildren }: Props = $props()

	createPartIDContext(() => partID)

	const enableXR = new PersistedState('enable-xr', false)

	let root: HTMLElement
</script>

<svelte:window
	onkeydown={(event) => {
		if (event.ctrlKey && event.key.toLowerCase() === 'a') {
			enableXR.current = !enableXR.current
		}
	}}
/>

<div
	class="relative h-full w-full"
	bind:this={root}
>
	<Canvas renderMode="always">
		<World>
			<SceneProviders>
				{#snippet children({ focus })}
					<Scene>
						{@render appChildren?.()}

						{#if enableXR.current}
							<XR />
						{/if}
					</Scene>

					<DomPortal element={root}>
						<Dashboard />
						<Details />
					</DomPortal>

					{#if !focus}
						<DomPortal element={root}>
							<TreeContainer />
						</DomPortal>
					{/if}
				{/snippet}
			</SceneProviders>
		</World>
	</Canvas>
</div>

{#if enableXR.current}
	<XRButton mode="immersive-ar" />
{/if}
