<script lang="ts">
	import type { Snippet } from 'svelte'
	import type { HTMLButtonAttributes } from 'svelte/elements'

	import * as popover from '@zag-js/popover'
	import { normalizeProps, portal, useMachine } from '@zag-js/svelte'

	interface Props {
		trigger: Snippet<[HTMLButtonAttributes, { isOpen: boolean }]>
		children: Snippet<[{ close: () => void }]>

		/** Preferred side. Flips and slides on its own when it would overflow. */
		placement?: popover.Placement
	}

	let { children, trigger, placement = 'bottom' }: Props = $props()

	const id = $props.id()
	const service = useMachine(popover.machine, () => ({
		id,
		positioning: { placement, gutter: 6, flip: true, slide: true, overflowPadding: 8 },
		/**
		 * Focus stays on the trigger. These hold settings controls, and pulling focus
		 * into the first one on open leaves it looking selected. zag proxies Tab from
		 * the trigger into the content, so keyboard access survives.
		 */
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
	<!--
		Content first, arrow second, for two reasons: zag mirrors
		`firstElementChild`'s computed z-index up to the positioner as `--z-index`
		(which its inline style resolves against), and the arrow should paint over
		the content edge it is joined to.
	-->
	<div
		{...api.getContentProps()}
		class="border-medium z-(--z-index-top) border bg-white shadow-sm"
	>
		{@render children({ close })}
	</div>

	<!--
		Not folded into the content's `hidden` state: zag leaves the content mounted
		while closed so consumers keep their state, and the arrow has no hidden
		attribute of its own.
	-->
	{#if api.open}
		<div {...api.getArrowProps()}>
			<!--
				The tip is a square rotated to face the trigger. Whichever side the
				popover lands on, the rotation puts its top and left edges outward, so
				those are the two that carry the border.
			-->
			<div
				{...api.getArrowTipProps()}
				class="border-medium border-t border-l"
			></div>
		</div>
	{/if}
</div>
