<script lang="ts">
	import type { Snippet } from 'svelte'
	import type { HTMLButtonAttributes } from 'svelte/elements'

	import * as popover from '@zag-js/popover'
	import { normalizeProps, portal, useMachine } from '@zag-js/svelte'

	interface Props {
		trigger: Snippet<[HTMLButtonAttributes, { isOpen: boolean }]>
		children: Snippet<[{ close: () => void }]>

		placement?: popover.Placement
	}

	let { children, trigger, placement = 'bottom' }: Props = $props()

	const id = $props.id()
	const service = useMachine(popover.machine, () => ({
		id,
		positioning: { placement, gutter: 6, flip: true, slide: true, overflowPadding: 8 },
		autoFocus: false,
	}))
	const api = $derived(popover.connect(service, normalizeProps))

	const close = () => api.setOpen(false)
</script>

{@render trigger(api.getTriggerProps(), { isOpen: api.open })}

<div
	use:portal={{ disabled: !api.portalled }}
	{...api.getPositionerProps()}
	class="[--arrow-background:var(--color-white)] [--arrow-size:8px]"
>
	<div
		{...api.getContentProps()}
		class="border-medium z-(--z-index-top) border bg-white shadow-sm"
	>
		{@render children({ close })}
	</div>

	{#if api.open}
		<div {...api.getArrowProps()}>
			<div
				{...api.getArrowTipProps()}
				class="border-medium border-t border-l"
			></div>
		</div>
	{/if}
</div>
