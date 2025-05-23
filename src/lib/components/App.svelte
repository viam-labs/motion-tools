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
	import XR from '$lib/components/XR.svelte'
	import { World } from '@threlte/rapier'
	import { createPartIDContext } from '$lib/hooks/usePartID.svelte'

	interface Props {
		partID?: string
		children?: Snippet
	}

	let { partID = '', children: appChildren }: Props = $props()

	createPartIDContext(() => partID)

	const enableXR = new PersistedState('enable-xr', false)
</script>

<svelte:window
	onkeydown={(event) => {
		if (event.ctrlKey && event.key.toLowerCase() === 'a') {
			enableXR.current = !enableXR.current
		}
	}}
/>

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

				<DomPortal>
					<Details />
				</DomPortal>

				{#if !focus}
					<DomPortal>
						<TreeContainer />
					</DomPortal>
				{/if}
			{/snippet}
		</SceneProviders>
	</World>
</Canvas>

{#if enableXR.current}
	<XRButton mode="immersive-ar" />
{/if}
