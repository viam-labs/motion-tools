<script lang="ts">
	let { children } = $props()

	let div: HTMLDivElement

	$effect(() => {
		document.body.append(div)
		return () => div.remove()
	})
</script>

<div
	style="display: contents"
	bind:this={div}
>
	{@render children()}
</div>
