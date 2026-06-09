<script lang="ts">
	import type { Snippet } from 'svelte'
	import type { HTMLButtonAttributes } from 'svelte/elements'

	import * as popover from '@zag-js/popover'
	import { normalizeProps, portal, useMachine } from '@zag-js/svelte'

	interface Props {
		trigger: Snippet<[HTMLButtonAttributes, { isOpen: boolean }]>
		children: Snippet<[{ close: () => void }]>
	}

	let { children, trigger }: Props = $props()

	const id = $props.id()
	const service = useMachine(popover.machine, { id })
	const api = $derived(popover.connect(service, normalizeProps))

	const close = () => api.setOpen(false)
</script>

{@render trigger(api.getTriggerProps(), { isOpen: api.open })}

<!--
	The menu is portalled to <body>, so it must out-stack scene-space entity labels and 
	panels. zag drives the positioner's z-index from `var(--z-index)`, which it copies from 
	the *content* element's computed z-index. So the z-index must live on the content, not 
	the positioner. 
-->
<div
	use:portal={{ disabled: !api.portalled }}
	{...api.getPositionerProps()}
>
	<div
		class="z-max"
		{...api.getContentProps()}
	>
		{@render children({ close })}
	</div>
</div>
