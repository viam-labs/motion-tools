<script lang="ts">
	import type { Snippet } from 'svelte'

	interface Props {
		selector?: string
		children: Snippet
	}

	let { children, selector = 'body' }: Props = $props()

	let div: HTMLDivElement

	$effect(() => {
		document.querySelector(selector)?.append(div)
		return () => {
			// eslint-disable-next-line svelte/no-dom-manipulating
			div.remove()
		}
	})
</script>

<div
	style="display: contents"
	bind:this={div}
>
	{@render children()}
</div>
