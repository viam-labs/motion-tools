<script lang="ts">
	import '../app.css'

	import type { DialConf } from '@viamrobotics/sdk'

	import { ViamAppProvider, ViamProvider } from '@viamrobotics/svelte-sdk'

	import { Visualizer } from '$lib'
	import { backendIP, websocketPort } from '$lib/defines'
	import {
		DrawService,
		Focus,
		FrameEditing,
		LiveUpdatesBanner,
		Logs,
		MeasureTool,
		XR,
	} from '$lib/plugins'

	import MachineConnectionProvider from './lib/components/MachineConnectionProvider.svelte'
	import Machines from './lib/components/Machines.svelte'
	import StandaloneLLMWrapper from './lib/components/StandaloneLLMWrapper.svelte'
	import {
		provideConnectionConfigs,
		useActiveConnectionConfig,
	} from './lib/hooks/useConnectionConfigs.svelte'
	import { getDialConfs } from './lib/robots'

	provideConnectionConfigs()

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
			>
				{@render children()}

				{#snippet dashboard()}
					<Machines bind:isOpen={isMachinesPageOpen} />
				{/snippet}

				<Logs />
				<DrawService config={{ backendIP, websocketPort }} />
				<Focus />
				<MeasureTool />
				<StandaloneLLMWrapper />

				<FrameEditing {partID} />
				<LiveUpdatesBanner />

				<XR />
			</Visualizer>
		</MachineConnectionProvider>
	</ViamAppProvider>
</ViamProvider>
