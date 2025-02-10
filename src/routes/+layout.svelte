<script lang="ts">
	import { ViamProvider } from '$lib/svelte-sdk'
	import '../app.css'
	import { QueryClient, QueryClientProvider } from '@tanstack/svelte-query'

	let { children } = $props()
</script>

<QueryClientProvider client={new QueryClient()}>
	<ViamProvider>
		{@render children()}
	</ViamProvider>
</QueryClientProvider>
