<script lang="ts">
	import { useThrelte } from '@threlte/core'
	import { PersistedState } from 'runed'

	import DashboardButton from '$lib/components/overlay/dashboard/Button.svelte'
	import { useSettings } from '$lib/hooks/useSettings.svelte'

	import FloatingPanel from '../FloatingPanel.svelte'
	import { useSettingsTabs } from '../Portals/useSettingsTabs.svelte'
	import WorkspacePortal from '../Portals/WorkspacePortal.svelte'
	import ConnectionSettings from './ConnectionSettings.svelte'
	import DebugSettings from './DebugSettings.svelte'
	import PointcloudSettings from './PointcloudSettings.svelte'
	import SceneSettings from './SceneSettings.svelte'
	import Tabs from './Tabs.svelte'
	import VisionSettings from './VisionSettings.svelte'
	import WeblabSettings from './WeblabSettings.svelte'

	const { invalidate } = useThrelte()
	const settings = useSettings()
	const settingsTabs = useSettingsTabs()

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

<WorkspacePortal>
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
</WorkspacePortal>

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
			{ label: 'Debug', component: DebugSettings },
			{ label: 'Weblabs', component: WeblabSettings },
			...settingsTabs.current,
		]}
		onValueChange={(value) => {
			activeTab.current = value
		}}
	/>
</FloatingPanel>
