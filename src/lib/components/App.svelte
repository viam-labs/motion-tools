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
	import { backendIP, websocketPort } from '$lib/defines'
	import { provideWorld, traits, useQuery } from '$lib/ecs'
	import { provideAnthropicKey, useAnthropicKey } from '$lib/hooks/useAnthropicKey.svelte'
	import { type CameraPose, provideCameraControls } from '$lib/hooks/useControls.svelte'
	import { provideEnvironment } from '$lib/hooks/useEnvironment.svelte'
	import { providePartConfig } from '$lib/hooks/usePartConfig.svelte'
	import { createPartIDContext } from '$lib/hooks/usePartID.svelte'
	import { provideSettings } from '$lib/hooks/useSettings.svelte'
	import { provideWeblabs } from '$lib/hooks/useWeblabs.svelte'
	import { domPortal } from '$lib/portal'
	import { LLMSceneBuilder, type InferCallback } from '$lib/plugins'

	import FileDrop from './FileDrop/FileDrop.svelte'
	import HoveredEntities from './hover/HoveredEntities.svelte'
	import AddFrames from './overlay/AddFrames.svelte'
	import LiveUpdatesBanner from './overlay/LiveUpdatesBanner.svelte'
	import Logs from './overlay/Logs.svelte'
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

		/**
		 * When provided, mounts the LLM Frame Builder plugin using this callback for inference.
		 * In the standalone visualizer, the plugin mounts automatically with the LLM endpoint
		 * in the draw-server. In the embedded app, pass in the org-scoped inference instead.
		 */
		onInfer?: InferCallback
	}

	let {
		partID = '',
		inputBindingsEnabled = true,
		localConfigProps,
		cameraPose,
		onInfer,
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

	const anthropicKey = useAnthropicKey()

	const standaloneInfer: InferCallback = async (prompt, components) => {
		const res = await fetch(`http://${backendIP}:${websocketPort}/scene-builder`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				prompt,
				components,
				anthropicApiKey: anthropicKey.current || undefined,
			}),
		})
		if (!res.ok) {
			throw new Error(`${res.status}: ${await res.text()}`)
		}
		return res.json()
	}

	let root = $state.raw<HTMLElement>()

	providePartConfig(
		() => partID,
		() => localConfigProps
	)

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
				{#if !localConfigProps || onInfer}
					<LLMSceneBuilder onInfer={onInfer ?? standaloneInfer} />
				{/if}
			</div>
		</SceneProviders>
	</Canvas>

	<ToastContainer />
</div>
