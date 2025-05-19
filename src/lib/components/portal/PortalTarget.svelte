<script lang="ts">
	import { usePortalContext } from './usePortalContext.svelte'

	interface Props {
		id?: string
	}

	let { id = 'default' }: Props = $props()

	const portals = usePortalContext()
	const childArray = $derived(portals.get(id))
</script>

{#if childArray}
	{#each childArray as children (children)}
		{@render children?.()}
	{/each}
{/if}
