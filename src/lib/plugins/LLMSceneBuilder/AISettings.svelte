<script lang="ts">
	import { Input } from '@viamrobotics/prime-core'

	import { useSettings } from '$lib/hooks/useSettings.svelte'

	const settings = useSettings()
</script>

<div class="flex flex-col gap-2.5 text-xs">
	<h3 class="border-gray-3 border-b py-1 text-sm"><strong>Anthropic</strong></h3>
	<label class="flex flex-col gap-1">
		API key
		<Input
			type="password"
			bind:value={settings.current.anthropicKey}
			placeholder="sk-ant-..."
		/>
	</label>
	<p class="text-gray-5">Used by the Scene Builder AI feature. Stored locally in your browser.</p>
</div>
