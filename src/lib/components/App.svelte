<script lang="ts">
	import type { Snippet } from 'svelte'
	import { Canvas } from '@threlte/core'
	import { XRButton } from '@threlte/xr'
	import Scene from './Scene.svelte'
	import TreeContainer from '$lib/components/Tree/TreeContainer.svelte'
	import Logs from '$lib/components/Logs.svelte'
	import Details from '$lib/components/Details.svelte'
	import Providers from './Providers.svelte'
	import DomPortal from './DomPortal.svelte'
	import { PersistedState } from 'runed'
	import XR from '$lib/components/XR.svelte'

	interface Props {
		children?: Snippet
	}

	let { children: appChildren }: Props = $props()

	const enableXR = new PersistedState('enable-xr', false)
</script>

<svelte:window
	onkeydown={(event) => {
		if (event.ctrlKey && event.key.toLowerCase() === 'q') {
			enableXR.current = !enableXR.current
		}
	}}
/>

<Canvas renderMode="always">
	<Providers>
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
					<Logs />
				</DomPortal>
			{/if}
		{/snippet}
	</Providers>
</Canvas>

{#if enableXR.current}
	<XRButton mode="immersive-ar" />
{/if}
