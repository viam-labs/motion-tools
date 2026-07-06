import { getContext, setContext, type Snippet } from 'svelte'

interface SettingsTab {
	label: string
	children: Snippet
}

interface Context {
	current: SettingsTab[]
}

const key = Symbol('settings-tabs-context')

export const provideSettingsTabs = () => {
	const settingsTabs = $state<SettingsTab[]>([])

	setContext<Context>(key, {
		get current() {
			return settingsTabs
		},
	})
}

export const useSettingsTabs = () => {
	return getContext<Context>(key)
}
