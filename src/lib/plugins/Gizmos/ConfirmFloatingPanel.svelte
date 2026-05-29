<script lang="ts">
	import type { Vector3Tuple } from 'three'

	import { HTML } from '@threlte/extras'
	import { Check, Plus, Undo2, X } from 'lucide-svelte'

	interface Props {
		position: Vector3Tuple

		/** Commit the pending gizmo and exit gizmo mode with it selected. */
		onConfirm: () => void

		/** Discard the pending gizmo; if no pending, exit gizmo mode. */
		onCancel: () => void

		/**
		 * Commit the pending gizmo and stay in placement mode so the user can
		 * drop another of the same kind. Hidden when omitted (e.g. for tools
		 * that only ever place a single instance).
		 */
		onAddNext?: () => void

		/**
		 * Step-undo the most recent placed gizmo in multi-place flows. Hidden
		 * when there's nothing to roll back.
		 */
		onUndo?: () => void
	}

	let { position, onConfirm, onCancel, onAddNext, onUndo }: Props = $props()

	const stopPointerBubble = (el: HTMLElement) => {
		const stop = (event: PointerEvent) => event.stopPropagation()
		el.addEventListener('pointerdown', stop)
		el.addEventListener('pointerup', stop)
		el.addEventListener('pointermove', stop)
		return {
			destroy() {
				el.removeEventListener('pointerdown', stop)
				el.removeEventListener('pointerup', stop)
				el.removeEventListener('pointermove', stop)
			},
		}
	}

	const buttonClass =
		'hover:bg-light flex min-w-9 flex-col items-center justify-center gap-0.5 rounded px-1.5 py-1 focus:outline-none focus-visible:ring-2'
	const hotkeyClass = 'font-mono text-[10px] leading-none opacity-60'
</script>

<HTML
	center
	{position}
	zIndexRange={[100, 0]}
>
	<div
		class="border-medium pointer-events-auto flex -translate-y-10 gap-0.5 rounded border bg-white p-0.5 shadow-md"
		use:stopPointerBubble
	>
		{#if onUndo}
			<button
				class={[buttonClass, 'text-blue-600 focus-visible:ring-blue-500']}
				type="button"
				title="Undo last (⌫)"
				onclick={onUndo}
			>
				<Undo2
					class="size-4"
					aria-hidden="true"
				/>
				<span
					class={hotkeyClass}
					aria-hidden="true">⌫</span
				>
			</button>
		{/if}
		<button
			class={[buttonClass, 'text-red-600 focus-visible:ring-red-500']}
			type="button"
			title="Cancel (esc)"
			onclick={onCancel}
		>
			<X
				class="size-4"
				aria-hidden="true"
			/>
			<span
				class={hotkeyClass}
				aria-hidden="true">Esc</span
			>
		</button>
		{#if onAddNext}
			<button
				class={[buttonClass, 'text-blue-600 focus-visible:ring-blue-500']}
				type="button"
				title="Commit and add another (space)"
				onclick={onAddNext}
			>
				<Plus
					class="size-4"
					aria-hidden="true"
				/>
				<span
					class={hotkeyClass}
					aria-hidden="true">Space</span
				>
			</button>
		{/if}
		<button
			class={[buttonClass, 'text-green-600 focus-visible:ring-green-500']}
			type="button"
			title="Confirm and exit (↵)"
			onclick={onConfirm}
		>
			<Check
				class="size-4"
				aria-hidden="true"
			/>
			<span
				class={hotkeyClass}
				aria-hidden="true">↵</span
			>
		</button>
	</div>
</HTML>
