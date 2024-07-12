<script lang="ts">
	import App from '$lib/components/App.svelte'
	import { XRButton } from '@threlte/xr'
	import { QueryClient, QueryClientProvider } from '@tanstack/svelte-query'
</script>

<QueryClientProvider client={new QueryClient()}>
	<div>
		<App />
		<XRButton
			mode="immersive-ar"
			sessionInit={{ optionalFeatures: ['depth-sensing'] }}
		/>
	</div>
</QueryClientProvider>

<style>
	:global(body) {
		margin: 0;
	}

	div {
		width: 100vw;
		height: 100vh;
		background: rgb(13, 19, 32);
		background: linear-gradient(180deg, rgba(13, 19, 32, 1) 0%, rgba(8, 12, 21, 1) 100%);
	}
</style>
