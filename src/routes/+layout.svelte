<script lang="ts">
	import Machines from '$lib/components/Machines.svelte'
	import { provideConnectionConfigs } from '$lib/hooks'
	import { ViamProvider } from '$lib/svelte-sdk'
	import '../app.css'
	import { QueryClient, QueryClientProvider } from '@tanstack/svelte-query'

	provideConnectionConfigs()

	let { children } = $props()
</script>

<Machines />

<QueryClientProvider client={new QueryClient()}>
	<ViamProvider>
		{@render children()}
	</ViamProvider>
</QueryClientProvider>
