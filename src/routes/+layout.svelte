<script lang="ts">
	import '../app.css'

	import type { DialConf } from '@viamrobotics/sdk'
	import { ViamProvider } from '@viamrobotics/svelte-sdk'
	import { MotionTools } from '$lib'
	import {
		provideConnectionConfigs,
		useActiveConnectionConfig,
	} from './lib/hooks/useConnectionConfigs.svelte'
	import Machines from './lib/components/Machines.svelte'
	import { getDialConfs } from './lib/robots'
	import { PersistedState } from 'runed'
	import { SvelteQueryDevtools } from '@tanstack/svelte-query-devtools'
	import { QueryClient } from '@tanstack/svelte-query'

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

	const queryDevtoolsOpen = new PersistedState('query-devtools-open', false)

	const client = new QueryClient({
		defaultOptions: {
			queries: {
				staleTime: Infinity,
			},
		},
	})
	console.log(client.getDefaultOptions())
</script>

<svelte:window
	onkeydown={({ key }) => {
		if (key === '0') {
			queryDevtoolsOpen.current = !queryDevtoolsOpen.current
		}
	}}
/>

<Machines />

<ViamProvider
	{dialConfigs}
	{client}
>
	<MotionTools {partID}>
		{@render children()}
	</MotionTools>

	{#if queryDevtoolsOpen.current}
		<SvelteQueryDevtools initialIsOpen />
	{/if}
</ViamProvider>
