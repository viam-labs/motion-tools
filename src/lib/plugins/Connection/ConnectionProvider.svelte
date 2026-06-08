<script lang="ts">
	import type { DialConf } from '@viamrobotics/sdk'
	import type { Snippet } from 'svelte'

	import { ViamAppProvider, ViamProvider } from '@viamrobotics/svelte-sdk'

	import type { ConnectionConfig } from './config'

	import MachineConnectionProvider from './MachineConnectionProvider.svelte'
	import { getDialConfs } from './robots'
	import {
		provideConnectionConfigs,
		useActiveConnectionConfig,
	} from './useConnectionConfigs.svelte'
	import { provideConnectionPanel } from './useConnectionPanel.svelte'

	interface Props {
		/**
		 * Read-only seed configs supplied by the host app (e.g. parsed from its build
		 * env). Pinned to the front of the list and not user-deletable.
		 */
		initialConfigs?: ConnectionConfig[]
		/**
		 * Render the visualizer here. `partID` is the active config's part, and
		 * `isPanelOpen` reflects the config panel — wire it to
		 * `<Visualizer inputBindingsEnabled={!isPanelOpen}>` to suppress viewport input
		 * while the panel's fields are focused.
		 */
		children: Snippet<[{ partID: string | undefined; isPanelOpen: boolean }]>
	}

	const { initialConfigs = [], children }: Props = $props()

	provideConnectionConfigs(() => initialConfigs)

	const connectionConfig = useActiveConnectionConfig()
	const panel = provideConnectionPanel()

	const dialConfigs = $derived.by<Record<string, DialConf>>(() => {
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
			{@render children({ partID, isPanelOpen: panel.isOpen })}
		</MachineConnectionProvider>
	</ViamAppProvider>
</ViamProvider>
