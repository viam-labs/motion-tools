<script lang="ts">
	import type { Snippet } from 'svelte'

	interface Props {
		element?: HTMLElement
		children: Snippet
	}

	let { children, element }: Props = $props()

	let div: HTMLDivElement

	$effect(() => {
		const parent = element ?? document.body
		parent.append(div)
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
