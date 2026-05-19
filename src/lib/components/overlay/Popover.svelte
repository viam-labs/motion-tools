<script lang="ts">
	import type { Snippet } from 'svelte'
	import type { HTMLButtonAttributes } from 'svelte/elements'

	import * as popover from '@zag-js/popover'
	import { normalizeProps, portal, useMachine } from '@zag-js/svelte'

	interface Props {
		trigger: Snippet<[HTMLButtonAttributes]>
		children: Snippet
		open?: boolean
	}

	let { children, trigger, open = $bindable(false) }: Props = $props()

	const id = $props.id()
	const service = useMachine(popover.machine, () => ({
		id,
		open,
		onOpenChange(details: { open: boolean }) {
			open = details.open
		},
	}))
	const api = $derived(popover.connect(service, normalizeProps))
</script>

{@render trigger(api.getTriggerProps())}

<div
	use:portal={{ disabled: !api.portalled }}
	{...api.getPositionerProps()}
>
	<div {...api.getContentProps()}>
		{@render children()}
	</div>
</div>
