<script lang="ts">
	import type { Entity } from 'koota'
	import type { Snippet } from 'svelte'

	import { Canvas } from '@threlte/core'
	import { PortalTarget } from '@threlte/extras'
	import { useXR } from '@threlte/xr'
	import { provideToast, ToastContainer } from '@viamrobotics/prime-core'
	import { primeTheme } from '@viamrobotics/tweakpane-config'
	import { ThemeUtils } from 'svelte-tweakpane-ui'

	import Controls from '$lib/components/overlay/controls/Controls.svelte'
	import Dashboard from '$lib/components/overlay/dashboard/Dashboard.svelte'
	import Details from '$lib/components/overlay/Details.svelte'
	import TreeContainer from '$lib/components/overlay/left-pane/TreeContainer.svelte'
	import Settings from '$lib/components/overlay/settings/Settings.svelte'
	import { provideWorld, traits, useQuery } from '$lib/ecs'
	import { type CameraPose, provideCameraControls } from '$lib/hooks/useControls.svelte'
	import { provideEnvironment } from '$lib/hooks/useEnvironment.svelte'
	import { createPartIDContext } from '$lib/hooks/usePartID.svelte'
	import { provideSettings } from '$lib/hooks/useSettings.svelte'
	import { provideWeblabs } from '$lib/hooks/useWeblabs.svelte'
	import { provideFullscreen } from '$lib/plugins/Fullscreen/useFullscreen.svelte'
	import { domPortal } from '$lib/portal'

	import FileDrop from './FileDrop/FileDrop.svelte'
	import HoveredEntities from './hover/HoveredEntities.svelte'
	import { provideSettingsTabs } from './overlay/Portals/useSettingsTabs.svelte'
	import ArmPositions from './overlay/widgets/ArmPositions.svelte'
	import Camera from './overlay/widgets/Camera.svelte'
	import FramePov from './overlay/widgets/FramePov.svelte'
	import Scene from './Scene.svelte'
	import SceneProviders from './SceneProviders.svelte'

	interface Props {
		partID?: string
		inputBindingsEnabled?: boolean

		/**
		 * Allows setting the initial camera pose
		 */
		cameraPose?: CameraPose

		/**
		 * Snippet for Three.js objects
		 */
		children?: Snippet

		/**
		 * Snippet to inject items in the top middle dashboard
		 */
		dashboard?: Snippet

		/**
		 * Snippet to inject items into the details panel
		 */
		details?: Snippet<[{ entity: Entity }]>
	}

	let {
		partID = '',
		inputBindingsEnabled = true,

		cameraPose,
		children: appChildren,
		dashboard,
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

	$effect(() => {
		environment.current.inputBindingsEnabled = inputBindingsEnabled
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
				<Dashboard {dashboard} />
				<Controls />

				{#each selected.current as entity, index (entity)}
					<Details
						{entity}
						{details}
						style="transform: translate(0, {fullscreen.baseOffset + index * 40}px)"
					/>
				{/each}

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
			</div>
		</SceneProviders>
	</Canvas>

	<ToastContainer />
</div>
