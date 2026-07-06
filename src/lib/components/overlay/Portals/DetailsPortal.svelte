<script lang="ts">
	import type { Snippet } from 'svelte'

	import { Portal } from '@threlte/extras'

	interface Props {
		children: Snippet
	}

	let { children }: Props = $props()
</script>

<Portal id="details">
	{@render children()}
</Portal>
