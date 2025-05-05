<script lang="ts">
	import '../app.css'

	import type { DialConf } from '@viamrobotics/sdk'
	import { ViamProvider } from '@viamrobotics/svelte-sdk'
	import Machines from '$lib/components/Machines.svelte'
	import { provideConnectionConfigs } from '$lib/hooks'
	import { getDialConfs } from '$lib/robots'
	import { useActiveConnectionConfig } from '$lib/hooks'
	import { createPartIDContext } from '$lib/hooks/usePartID.svelte'
	import MotionTools from '$lib/components/App.svelte'
	import { PersistedState } from 'runed'
	import { SvelteQueryDevtools } from '@tanstack/svelte-query-devtools'

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

	const queryDevtoolsOpen = new PersistedState('query-devtools-open', false)
</script>

<svelte:window
	onkeydown={({ key }) => {
		if (key === '0') {
			queryDevtoolsOpen.current = !queryDevtoolsOpen.current
		}
	}}
/>

<Machines />

<ViamProvider {dialConfigs}>
	<MotionTools>
		{@render children()}
	</MotionTools>

	{#if queryDevtoolsOpen.current}
		<SvelteQueryDevtools initialIsOpen />
	{/if}
</ViamProvider>
