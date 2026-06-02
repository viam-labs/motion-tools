import { useThrelte } from '@threlte/core'

import { useGizmos } from './useGizmos.svelte'

/**
 * Cancel a pending tool action. Escape always triggers. Right-click triggers
 * only while a tool is active.
 */
export const useCancelInput = (handler: () => void) => {
	const { dom } = useThrelte()
	const plugin = useGizmos()

	const onKey = (event: KeyboardEvent) => {
		if (event.key === 'Escape') handler()
	}

	const onContext = (event: MouseEvent) => {
		if (plugin.mode === 'idle') return

		event.preventDefault()
		handler()
	}

	$effect(() => {
		window.addEventListener('keydown', onKey)
		dom.addEventListener('contextmenu', onContext)
		return () => {
			window.removeEventListener('keydown', onKey)
			dom.removeEventListener('contextmenu', onContext)
		}
	})
}

/** Confirm a pending tool action. */
export const useConfirmInput = (handler: () => void) => {
	const onKey = (event: KeyboardEvent) => {
		if (event.key !== 'Enter') return
		if (isInteractive(event.target as HTMLElement | null)) return

		handler()
	}

	$effect(() => {
		window.addEventListener('keydown', onKey)
		return () => window.removeEventListener('keydown', onKey)
	})
}

/** Undo the last pending tool action. */
export const useUndoInput = (handler: () => void) => {
	const onKey = (event: KeyboardEvent) => {
		if (event.key !== 'Backspace') return
		if (isInteractive(event.target as HTMLElement | null)) return

		handler()
	}

	$effect(() => {
		window.addEventListener('keydown', onKey)
		return () => window.removeEventListener('keydown', onKey)
	})
}

/** Commit the current pending tool action and add another. */
export const useAddNextInput = (handler: () => void) => {
	const onKey = (event: KeyboardEvent) => {
		if (event.key !== ' ') return
		if (isInteractive(event.target as HTMLElement | null)) return

		event.preventDefault()
		handler()
	}

	$effect(() => {
		window.addEventListener('keydown', onKey)
		return () => window.removeEventListener('keydown', onKey)
	})
}

const isInteractive = (target: HTMLElement | null) =>
	target?.isContentEditable === true ||
	(target?.matches('input, textarea, select, a, button, summary') ?? false)
