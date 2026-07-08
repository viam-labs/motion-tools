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

<div
	use:portal={{ disabled: !api.portalled }}
	{...api.getPositionerProps()}
>
	<div {...api.getContentProps()}>
		{@render children({ close })}
	</div>
</div>
