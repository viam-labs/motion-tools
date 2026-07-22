<script lang="ts">
	import type { Snippet } from 'svelte'

	import { Icon } from '@viamrobotics/prime-core'
	import { PersistedState } from 'runed'

	interface Props {
		name: string
		defaultOpen?: boolean
		children: Snippet
		titleAlert?: Snippet
	}

	let { name, children, titleAlert, defaultOpen = false }: Props = $props()

	const expanded = $derived(new PersistedState(`${name}-expanded`, defaultOpen))
</script>

<button
	class="border-medium w-full border-t p-2 text-left"
	aria-expanded={expanded.current}
	onclick={() => (expanded.current = !expanded.current)}
>
	<h3 class="text-default flex items-center gap-1.5">
		<Icon
			name={expanded.current ? 'unfold-more-horizontal' : 'unfold-less-horizontal'}
			cx="text-subtle-1 size-6"
			aria-hidden="true"
		/>
		{name}
		{@render titleAlert?.()}
	</h3>
</button>

{#if expanded.current}
	<div class="border-medium border-t">
		{@render children()}
	</div>
{/if}
