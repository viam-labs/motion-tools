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
	import Introduction from './Messages/Introduction.svelte'

	interface Props {
		children?: Snippet
	}

	let { children: appChildren }: Props = $props()
</script>

<Canvas renderMode="always">
	<Providers>
		{#snippet children({ focus })}
			<Scene>
				{@render appChildren?.()}
			</Scene>

			<DomPortal>
				<Introduction />
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

{#if false}
	<XRButton mode="immersive-ar" />
{/if}
