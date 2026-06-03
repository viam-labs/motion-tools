<script lang="ts">
	import type { Component } from 'svelte'

	import { useThrelte } from '@threlte/core'
	import { Portal } from '@threlte/extras'
	import { PersistedState } from 'runed'

	import DashboardButton from '$lib/components/overlay/dashboard/Button.svelte'
	import { useSettings } from '$lib/hooks/useSettings.svelte'

	import FloatingPanel from '../FloatingPanel.svelte'
	import ConnectionSettings from './ConnectionSettings.svelte'
	import DebugSettings from './DebugSettings.svelte'
	import PointcloudSettings from './PointcloudSettings.svelte'
	import SceneSettings from './SceneSettings.svelte'
	import Tabs from './Tabs.svelte'
	import VisionSettings from './VisionSettings.svelte'
	import WeblabSettings from './WeblabSettings.svelte'
	import WidgetSettings from './WidgetSettings.svelte'

	interface Props {
		settingsTabs?: {
			label: string
			component: Component
		}[]
	}

	let { settingsTabs = [] }: Props = $props()

	const { invalidate } = useThrelte()
	const settings = useSettings()

	// Invalidate the renderer for any settings change
	$effect(() => {
		for (const key in settings.current) {
			// eslint-disable-next-line @typescript-eslint/no-unused-expressions
			settings.current[key as keyof typeof settings.current]
		}

		invalidate()
	})

	const isOpen = new PersistedState('settings-is-open', false)
	const activeTab = new PersistedState('settings-active-tab', 'Connection')
</script>

<Portal id="dashboard">
	<fieldset>
		<DashboardButton
			active={isOpen.current}
			icon="cog"
			description="Settings"
			onclick={() => {
				isOpen.current = !isOpen.current
			}}
		/>
	</fieldset>
</Portal>

<FloatingPanel
	title="Settings"
	bind:isOpen={isOpen.current}
	defaultSize={{ width: 460, height: 500 }}
>
	<Tabs
		defaultTab={activeTab.current}
		items={[
			{ label: 'Connection', component: ConnectionSettings },
			{ label: 'Scene', component: SceneSettings },
			{ label: 'Pointclouds', component: PointcloudSettings },
			{ label: 'Vision', component: VisionSettings },
			{ label: 'Widgets', component: WidgetSettings },
			{ label: 'Debug', component: DebugSettings },
			{ label: 'Weblabs', component: WeblabSettings },
			...settingsTabs,
		]}
		onValueChange={(value) => {
			activeTab.current = value
		}}
	/>
</FloatingPanel>
