<script lang="ts">
	import type { Snippet } from 'svelte'
	import type { Vector3Tuple } from 'three'

	import { HTML } from '@threlte/extras'

	interface Props {
		position: Vector3Tuple
		onConfirm: () => void
		onCancel: () => void
		confirmLabel?: string
		cancelLabel?: string
		children?: Snippet
	}

	let {
		position,
		onConfirm,
		onCancel,
		confirmLabel = 'Confirm',
		cancelLabel = 'Cancel',
		children,
	}: Props = $props()

	/**
	 * Stop pointer events from bubbling to the canvas wrapper. Svelte 5
	 * delegates inline `onpointerdown` / `onpointerup` handlers at the document
	 * root, so calling `stopPropagation` inside a delegated handler runs
	 * *after* the native bubble has already reached `dom` — too late to stop
	 * three.js `TransformControls` (which calls `setPointerCapture`
	 * unconditionally on every left-button pointerdown). Attach native, non-
	 * delegated listeners directly on the element so stopPropagation actually
	 * intercepts the bubble.
	 */
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
</script>

<HTML
	center
	{position}
	zIndexRange={[100, 0]}
>
	<!--
		Translate further up in screen space than the TransformControls rotate
		rings reach, so the panel isn't visually covered or pointer-blocked by
		the gizmo handles when a pending arrow is in rotate mode.

		Stop pointer events from bubbling to the canvas wrapper:
		- `useMouseRaycaster` listens for `pointerup` on the wrapper and would
		  fire its synthetic `click` *before* the button's onclick (pointerup
		  precedes click in the DOM event sequence), causing the line tool to
		  drop a phantom vertex at the panel position.
		- Three.js TransformControls registers a `pointerdown` handler on the
		  same wrapper and calls `setPointerCapture` unconditionally on left
		  click, which retargets the subsequent pointerup to the wrapper and
		  prevents the button from ever receiving its `click` event.
	-->
	<div
		class="border-medium pointer-events-auto -translate-y-[calc(100%+120px)] border bg-white p-2 text-xs shadow-md"
		use:stopPointerBubble
	>
		{#if children}
			<div class="mb-2 flex flex-col gap-1">
				{@render children()}
			</div>
		{/if}

		<div class="flex gap-1">
			<button
				class="border-medium hover:bg-light flex-1 border px-2 py-1"
				type="button"
				onclick={onCancel}
			>
				{cancelLabel}
				<span class="text-subtle-2 ml-1 text-[10px]">esc</span>
			</button>
			<button
				class="bg-gray-8 hover:bg-gray-9 flex-1 border border-black px-2 py-1 text-white"
				type="button"
				onclick={onConfirm}
			>
				{confirmLabel}
				<span class="ml-1 text-[10px] opacity-70">↵</span>
			</button>
		</div>
	</div>
</HTML>
