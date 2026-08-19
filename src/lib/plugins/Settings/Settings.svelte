<script lang="ts">
	import { useThrelte } from '@threlte/core'
	import { PersistedState } from 'runed'

	import DashboardButton from '$lib/components/overlay/dashboard/Button.svelte'
	import Popover from '$lib/components/overlay/Popover.svelte'
	import { useSettingsTabs } from '$lib/components/overlay/Portals/useSettingsTabs.svelte'
	import WorkspacePortal from '$lib/components/overlay/Portals/WorkspacePortal.svelte'
	import { useSettings } from '$lib/hooks/useSettings.svelte'

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

	const activeTab = new PersistedState('settings-active-tab', 'Connection')
</script>

<WorkspacePortal>
	<fieldset>
		<Popover placement="bottom-end">
			{#snippet trigger(triggerProps, { isOpen })}
				<DashboardButton
					{...triggerProps}
					active={isOpen}
					icon="cog"
					description="Settings"
				/>
			{/snippet}

			<!-- Fixed height so the panel doesn't resize as the user moves between tabs. -->
			<div class="font-public-sans h-[500px] w-[460px]">
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
			</div>
		</Popover>
	</fieldset>
</WorkspacePortal>
