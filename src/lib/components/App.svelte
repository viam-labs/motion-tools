<script lang="ts">
	import type { Struct } from '@viamrobotics/sdk'
	import type { Entity } from 'koota'

	import { Canvas } from '@threlte/core'
	import { PortalTarget } from '@threlte/extras'
	import { useXR } from '@threlte/xr'
	import { provideToast, ToastContainer } from '@viamrobotics/prime-core'
	import { primeTheme } from '@viamrobotics/tweakpane-config'
	import { onMount, type Snippet } from 'svelte'
	import { ThemeUtils } from 'svelte-tweakpane-ui'

	import type { FragmentInfo } from '$lib/hooks/usePartConfig.svelte'

	import Controls from '$lib/components/overlay/controls/Controls.svelte'
	import Dashboard from '$lib/components/overlay/dashboard/Dashboard.svelte'
	import Details from '$lib/components/overlay/Details.svelte'
	import TreeContainer from '$lib/components/overlay/left-pane/TreeContainer.svelte'
	import Settings from '$lib/components/overlay/settings/Settings.svelte'
	import XR from '$lib/components/xr/XR.svelte'
	import { provideWorld, traits, useQuery } from '$lib/ecs'
	import { provideAnthropicKey } from '$lib/hooks/useAnthropicKey.svelte'
	import { type CameraPose, provideCameraControls } from '$lib/hooks/useControls.svelte'
	import { provideEnvironment } from '$lib/hooks/useEnvironment.svelte'
	import { providePartConfig } from '$lib/hooks/usePartConfig.svelte'
	import { createPartIDContext } from '$lib/hooks/usePartID.svelte'
	import { provideSceneBuilder } from '$lib/hooks/useSceneBuilder.svelte'
	import { provideSettings } from '$lib/hooks/useSettings.svelte'
	import { provideWeblabs } from '$lib/hooks/useWeblabs.svelte'
	import { domPortal } from '$lib/portal'

	import FileDrop from './FileDrop/FileDrop.svelte'
	import HoveredEntities from './hover/HoveredEntities.svelte'
	import AddFrames from './overlay/AddFrames.svelte'
	import LiveUpdatesBanner from './overlay/LiveUpdatesBanner.svelte'
	import Logs from './overlay/Logs.svelte'
	import SceneBuilder from './overlay/SceneBuilder/SceneBuilder.svelte'
	import ArmPositions from './overlay/widgets/ArmPositions.svelte'
	import Camera from './overlay/widgets/Camera.svelte'
	import FramePov from './overlay/widgets/FramePov.svelte'
	import Scene from './Scene.svelte'
	import SceneProviders from './SceneProviders.svelte'

	interface LocalConfigProps {
		current: Struct
		isDirty: boolean
		componentNameToFragmentInfo: Record<string, FragmentInfo>
		setLocalPartConfig: (config: Struct) => void
	}

	interface Props {
		partID?: string
		inputBindingsEnabled?: boolean
		localConfigProps?: LocalConfigProps

		/**
		 * Snippet for THREE objects
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

		/**
		 * Allows setting the initial camera pose
		 */
		cameraPose?: CameraPose
	}

	let {
		partID = '',
		inputBindingsEnabled = true,
		localConfigProps,
		cameraPose,
		children: appChildren,
		dashboard,
		details,
	}: Props = $props()

	provideWorld()

	const settings = provideSettings()
	const environment = provideEnvironment()
	const currentRobotCameraWidgets = $derived(settings.current.openCameraWidgets[partID] || [])
	const currentFramePovWidgets = $derived(settings.current.openFramePovWidgets[partID] || [])
	const { isPresenting } = useXR()

	provideCameraControls(() => cameraPose)
	createPartIDContext(() => partID)

	provideAnthropicKey()
	provideWeblabs()
	provideToast()

	let root = $state.raw<HTMLElement>()

	providePartConfig(
		() => partID,
		() => localConfigProps
	)
	provideSceneBuilder()

	$effect(() => {
		environment.current.inputBindingsEnabled = inputBindingsEnabled
		environment.current.isStandalone = !localConfigProps
	})

	onMount(() => {
		ThemeUtils.setGlobalDefaultTheme(primeTheme)
	})

	const selected = useQuery(traits.Selected)
</script>

<div
	class="relative h-full w-full overflow-hidden dark:bg-white"
	bind:this={root}
>
	<Canvas renderMode="on-demand">
		<SceneProviders>
			<Scene>
				{@render appChildren?.()}
			</Scene>

			<XR {@attach domPortal(root)} />

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
						style="transform: translate(0, {index * 40}px)"
					/>
				{/each}

				{#if environment.current.isStandalone}
					<LiveUpdatesBanner />
				{/if}

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
				<Logs />
				<AddFrames />
				<SceneBuilder />
			</div>
		</SceneProviders>
	</Canvas>

	<ToastContainer />
</div>
