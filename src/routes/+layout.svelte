<script lang="ts">
	import '../app.css'

	import type { DialConf } from '@viamrobotics/sdk'
	import { ViamProvider } from '@viamrobotics/svelte-sdk'
	import Machines from '$lib/components/Machines.svelte'
	import { provideConnectionConfigs } from '$lib/hooks'
	import { getDialConfs } from '$lib/robots'
	import { useActiveConnectionConfig } from '$lib/hooks'
	import { createPartIDContext } from '$lib/hooks/usePartID.svelte'
	import App from '$lib/components/App.svelte'

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
	<App>
		{@render children()}
	</App>
</ViamProvider>
