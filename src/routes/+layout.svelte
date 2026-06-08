<script lang="ts">
	import '../app.css'

	import { Visualizer } from '$lib'
	import { backendIP, websocketPort } from '$lib/defines'
	import {
		Connection,
		ConnectionProvider,
		DrawService,
		Focus,
		MeasureTool,
		XR,
		XRSettings,
	} from '$lib/plugins'

	import { envConfigs } from './lib/configs'

	let { children: pageChildren } = $props()
</script>

<ConnectionProvider initialConfigs={envConfigs}>
	{#snippet children({ partID, isPanelOpen })}
		<Visualizer
			{partID}
			inputBindingsEnabled={!isPanelOpen}
			settingsTabs={[{ label: 'AR', component: XRSettings }]}
		>
			{@render pageChildren()}

			{#snippet dashboard()}
				<Connection />
			{/snippet}

			<DrawService config={{ backendIP, websocketPort }} />
			<Focus />
			<MeasureTool />
			<XR />
		</Visualizer>
	{/snippet}
</ConnectionProvider>
