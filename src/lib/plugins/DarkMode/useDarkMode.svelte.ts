import type { ValueOf } from 'type-fest'

import { PersistedState } from 'runed'
import { getContext, setContext } from 'svelte'
import { MediaQuery } from 'svelte/reactivity'

const key = Symbol('dark-mode')

export type DarkModeContext = ReturnType<typeof provideDarkMode>

export const ThemeModes = {
	System: 'system',
	Dark: 'dark',
	Light: 'light',
} as const

type ThemeMode = ValueOf<typeof ThemeModes>

/** Each press advances to the next mode: system → dark → light → system. */
const nextMode: Record<ThemeMode, ThemeMode> = {
	[ThemeModes.System]: ThemeModes.Dark,
	[ThemeModes.Dark]: ThemeModes.Light,
	[ThemeModes.Light]: ThemeModes.System,
}

export const provideDarkMode = () => {
	const prefersDark = new MediaQuery('prefers-color-scheme: dark', false)
	const mode = new PersistedState<ThemeMode>('visualizer-color-scheme', ThemeModes.System)
	const isDark = $derived(mode.current === 'system' ? prefersDark.current : mode.current === 'dark')

	$effect(() => {
		const root = document.documentElement
		root.classList.toggle('dark', mode.current === ThemeModes.Dark)
		root.classList.toggle('light', mode.current === ThemeModes.Light)
	})

	return setContext(key, {
		get current() {
			return mode.current
		},

		get isDark() {
			return isDark
		},

		toggle() {
			mode.current = nextMode[mode.current]
		},
	})
}

export const useDarkMode = () => {
	const context = getContext<DarkModeContext>(key)
	if (!context) {
		// Fallback to light mode when used outside a <Visualizer />.
		return {
			current: ThemeModes.Light,
			isDark: false,
			toggle() {
				// noop
			},
		} satisfies DarkModeContext
	}

	return context
}
