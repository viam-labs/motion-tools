<script lang="ts">
	let { children } = $props()

	let div: HTMLDivElement

	$effect(() => {
		document.body.append(div)
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
