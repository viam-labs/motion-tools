<script lang="ts">
	import '../app.css'

	import type { DialConf } from '@viamrobotics/sdk'
	import { ViamProvider } from '@viamrobotics/svelte-sdk'
	import Machines from '$lib/components/Machines.svelte'
	import { provideConnectionConfigs } from '$lib/hooks'
	import { getDialConfs } from '$lib/robots'
	import { useActiveConnectionConfig } from '$lib/hooks'
	import { createPartIDContext } from '$lib/hooks/usePartID.svelte'
	import { provideStaticGeometries } from '$lib/hooks/useStaticGeometries.svelte'
	import { provideVisibility } from '$lib/hooks/useVisibility.svelte'
	import { provideWebsocket } from '$lib/hooks/useWebsocketClient.svelte'

	provideStaticGeometries()
	provideVisibility()
	provideWebsocket()
	provideConnectionConfigs()

	const connectionConfig = useActiveConnectionConfig()

	let { children } = $props()

	let dialConfigs = $derived.by<Record<string, DialConf>>(() => {
		if (connectionConfig.current) {
			const robot = {
				...$state.snapshot(connectionConfig.current),
				disableSessions: true,
			}

			return getDialConfs({ robot })
		}

		return {}
	})

	createPartIDContext(() => connectionConfig.current?.partId ?? '')
</script>

<Machines />

<ViamProvider {dialConfigs}>
	{@render children()}
</ViamProvider>
