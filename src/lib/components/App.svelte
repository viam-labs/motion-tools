<script lang="ts">
	import type { Struct } from '@viamrobotics/sdk'
	import type { Entity } from 'koota'
	import type { Snippet } from 'svelte'

	import { Canvas } from '@threlte/core'
	import { PortalTarget } from '@threlte/extras'
	import { useXR } from '@threlte/xr'
	import { provideToast, ToastContainer } from '@viamrobotics/prime-core'
	import { primeTheme } from '@viamrobotics/tweakpane-config'
	import { ThemeUtils } from 'svelte-tweakpane-ui'

	import type { FragmentInfo } from '$lib/hooks/useFragmentInfo.svelte'

	import Controls from '$lib/components/overlay/controls/Controls.svelte'
	import Dashboard from '$lib/components/overlay/dashboard/Dashboard.svelte'
	import Details from '$lib/components/overlay/Details.svelte'
	import TreeContainer from '$lib/components/overlay/left-pane/TreeContainer.svelte'
	import Settings from '$lib/components/overlay/settings/Settings.svelte'
	import Workspace from '$lib/components/overlay/workspace/Workspace.svelte'
	import { provideWorld, traits, useQuery } from '$lib/ecs'
	import { type CameraPose, provideCameraControls } from '$lib/hooks/useControls.svelte'
	import { provideEnvironment } from '$lib/hooks/useEnvironment.svelte'
	import { provideFragmentInfo } from '$lib/hooks/useFragmentInfo.svelte'
	import { providePartConfig } from '$lib/hooks/usePartConfig.svelte'
	import { createPartIDContext } from '$lib/hooks/usePartID.svelte'
	import { provideSettings } from '$lib/hooks/useSettings.svelte'
	import { provideWeblabs } from '$lib/hooks/useWeblabs.svelte'
	import { provideFullscreen } from '$lib/plugins/Fullscreen/useFullscreen.svelte'
	import { domPortal } from '$lib/portal'

	import FileDrop from './FileDrop/FileDrop.svelte'
	import HoveredEntities from './hover/HoveredEntities.svelte'
	import AddFrames from './overlay/AddFrames.svelte'
	import LiveUpdatesBanner from './overlay/LiveUpdatesBanner.svelte'
	import { provideSettingsTabs } from './overlay/Portals/useSettingsTabs.svelte'
	import ArmPositions from './overlay/widgets/ArmPositions.svelte'
	import Camera from './overlay/widgets/Camera.svelte'
	import FramePov from './overlay/widgets/FramePov.svelte'
	import Scene from './Scene.svelte'
	import SceneProviders from './SceneProviders.svelte'

	interface LocalConfigProps {
		current: Struct
		isDirty: boolean
		setLocalPartConfig: (config: Struct) => void
	}

	interface Props {
		partID?: string
		inputBindingsEnabled?: boolean
		localConfigProps?: LocalConfigProps

		/**
		 * Maps a component name to the fragment that defines it. Embedded hosts
		 * supply this; in standalone it is computed from fragment queries (omit).
		 */
		componentNameToFragmentInfo?: Record<string, FragmentInfo>

		/**
		 * Allows setting the initial camera pose
		 */
		cameraPose?: CameraPose

		/**
		 * Snippet for Three.js objects
		 */
		children?: Snippet

		/**
		 * Snippet to inject items into the details panel
		 */
		details?: Snippet<[{ entity: Entity }]>
	}

	let {
		partID = '',
		inputBindingsEnabled = true,
		localConfigProps,
		componentNameToFragmentInfo,
		cameraPose,
		children: appChildren,
		details,
	}: Props = $props()

	/**
	 * Apply the Viam tweakpane theme to `<html>` here in setup, before any child
	 * is created. This must not be deferred to `onMount`: a parent's `onMount`
	 * runs only after all of its children have mounted, and each child `<Pane>`
	 * builds its underlying Tweakpane instance during its own setup. So by the
	 * time App's `onMount` fired the panes already existed and could paint with
	 * Tweakpane's default dark theme before the theme variables reached `<html>`.
	 * Running in setup guarantees the variables are set before any pane is built.
	 * `setGlobalDefaultTheme` no-ops when there is no document (prerender).
	 */
	ThemeUtils.setGlobalDefaultTheme(primeTheme)

	provideWorld()
	provideSettingsTabs()

	const settings = provideSettings()
	const environment = provideEnvironment()
	const fullscreen = provideFullscreen()

	const currentRobotCameraWidgets = $derived(settings.current.openCameraWidgets[partID] || [])
	const currentFramePovWidgets = $derived(settings.current.openFramePovWidgets[partID] || [])
	const { isPresenting } = useXR()

	provideCameraControls(() => cameraPose)
	createPartIDContext(() => partID)

	provideWeblabs()
	provideToast()

	let root = $state.raw<HTMLElement>()

	provideFragmentInfo(
		() => partID,
		() => componentNameToFragmentInfo
	)

	providePartConfig(
		() => partID,
		() => localConfigProps
	)

	$effect(() => {
		environment.current.inputBindingsEnabled = inputBindingsEnabled
		environment.current.isStandalone = !localConfigProps
	})

	const selected = useQuery(traits.Selected)
</script>

<div
	class={[
		'h-full w-full overflow-hidden bg-white',
		fullscreen.active ? 'z-max fixed inset-0' : 'relative',
	]}
	bind:this={root}
>
	<Canvas renderMode="on-demand">
		<SceneProviders>
			<Scene>
				{@render appChildren?.()}
			</Scene>

			{#if settings.current.renderSubEntityHoverDetail}
				<HoveredEntities />
			{/if}

			<!-- Overlays that need Threlte context -->
			<div {@attach domPortal(root)}>
				<FileDrop />
				<Dashboard />
				<Workspace />
				<Controls />

				{#each selected.current as entity, index (entity)}
					<Details
						{entity}
						{details}
						style="transform: translate(0, {fullscreen.baseOffset + index * 40}px)"
					/>
				{/each}

				<LiveUpdatesBanner />

				<TreeContainer />

				{#if settings.current.enableArmPositionsWidget}
					<ArmPositions />
				{/if}

				{#if !$isPresenting}
					{#each currentRobotCameraWidgets as cameraName (cameraName)}
						<Camera name={cameraName} />
					{/each}

					{#each currentFramePovWidgets as povFrameName (povFrameName)}
						<FramePov frameName={povFrameName} />
					{/each}
				{/if}

				<PortalTarget id="dom" />

				<Settings />
				<AddFrames />
			</div>
		</SceneProviders>
	</Canvas>

	<ToastContainer />
</div>
