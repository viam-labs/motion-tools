<script lang="ts">
	import type { Snippet } from 'svelte'

	import * as dialog from '@zag-js/dialog'
	import { normalizeProps, portal, useMachine } from '@zag-js/svelte'

	interface Props {
		/** Controlled open state. */
		open?: boolean
		title: string
		description?: string
		/** Optional extra body content, rendered between the description and actions. */
		children?: Snippet
		/** Action buttons (e.g. Cancel / Discard). Receives a `close` callback. */
		actions?: Snippet<[{ close: () => void }]>
	}

	let { open = $bindable(false), title, description, children, actions }: Props = $props()

	const id = $props.id()
	const service = useMachine(dialog.machine, () => ({
		id,
		// Confirmations require an explicit response, so treat it as an alert dialog.
		role: 'alertdialog' as const,
		open,
		onOpenChange: (details: { open: boolean }) => {
			open = details.open
		},
	}))
	const api = $derived(dialog.connect(service, normalizeProps))

	const close = () => api.setOpen(false)
</script>

{#if api.open}
	<div use:portal>
		<div
			{...api.getBackdropProps()}
			class="bg-gray-9/40 z-max fixed inset-0"
		></div>
		<div
			{...api.getPositionerProps()}
			class="z-max fixed inset-0 flex items-center justify-center p-4"
		>
			<div
				{...api.getContentProps()}
				class="border-medium flex w-full max-w-sm flex-col gap-3 rounded border bg-white p-4 shadow-sm"
			>
				<h2
					{...api.getTitleProps()}
					class="font-space-grotesk text-heading text-sm font-medium"
				>
					{title}
				</h2>

				{#if description}
					<p
						{...api.getDescriptionProps()}
						class="text-subtle-1 text-sm"
					>
						{description}
					</p>
				{/if}

				{@render children?.()}

				{#if actions}
					<div class="mt-1 flex justify-end gap-2">
						{@render actions({ close })}
					</div>
				{/if}
			</div>
		</div>
	</div>
{/if}
