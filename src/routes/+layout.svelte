<script lang="ts">
	import '../app.css'

	import type { DialConf } from '@viamrobotics/sdk'

	import { ViamAppProvider, ViamProvider } from '@viamrobotics/svelte-sdk'

	import { Visualizer } from '$lib'
	import { backendIP, websocketPort } from '$lib/defines'
	import { provideSettings } from '$lib/hooks/useSettings.svelte'
	import { provideStandaloneLLM } from '$lib/hooks/useStandaloneLLM.svelte'
	import { AISettings, DrawService, Focus, MeasureTool, XR, XRSettings } from '$lib/plugins'
	import LLMSceneBuilder from '$lib/plugins/LLMSceneBuilder/LLMSceneBuilder.svelte'

	import MachineConnectionProvider from './lib/components/MachineConnectionProvider.svelte'
	import Machines from './lib/components/Machines.svelte'
	import {
		provideConnectionConfigs,
		useActiveConnectionConfig,
	} from './lib/hooks/useConnectionConfigs.svelte'
	import { getDialConfs } from './lib/robots'

	provideConnectionConfigs()
	provideSettings()
	const standaloneLLMContext = provideStandaloneLLM()

	const connectionConfig = useActiveConnectionConfig()

	let { children } = $props()

	let dialConfigs = $derived.by<Record<string, DialConf>>(() => {
		if (connectionConfig.current) {
			const robot = {
				...$state.snapshot(connectionConfig.current),
				disableSessions: true,
			}

			return { ...getDialConfs({ robot }) }
		}

		return {}
	})

	const partID = $derived(connectionConfig.current?.partId)
	const dialConfig = $derived(partID ? dialConfigs[partID] : undefined)

	let isMachinesPageOpen = $state(false)
</script>

<ViamProvider
	config={{
		defaultOptions: {
			queries: {
				staleTime: Infinity,
			},
		},
	}}
	{dialConfigs}
>
	<ViamAppProvider
		serviceHost="https://app.viam.com"
		credentials={{
			type: 'api-key',
			payload: connectionConfig.current?.apiKeyValue ?? '',
			authEntity: connectionConfig.current?.apiKeyId ?? '',
		}}
	>
		<MachineConnectionProvider
			{partID}
			{dialConfig}
		>
			<Visualizer
				{partID}
				inputBindingsEnabled={!isMachinesPageOpen}
				settingsTabs={[
					{ label: 'AR', component: XRSettings },
					{ label: 'AI', component: AISettings },
				]}
			>
				{@render children()}

				{#snippet dashboard()}
					<Machines bind:isOpen={isMachinesPageOpen} />
					<LLMSceneBuilder onInfer={standaloneLLMContext.current} />
				{/snippet}

				<DrawService config={{ backendIP, websocketPort }} />
				<Focus />
				<MeasureTool />
				<XR />
			</Visualizer>
		</MachineConnectionProvider>
	</ViamAppProvider>
</ViamProvider>
