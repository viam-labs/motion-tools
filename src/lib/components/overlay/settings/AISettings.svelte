<script lang="ts">
	import { Input } from '@viamrobotics/prime-core'

	import { useAnthropicKey } from '$lib/hooks/useAnthropicKey.svelte'

	const anthropicKey = useAnthropicKey()
</script>

<div class="flex flex-col gap-2.5 text-xs">
	<h3 class="border-gray-3 border-b py-1 text-sm"><strong>Anthropic</strong></h3>
	<label class="flex flex-col gap-1">
		API key
		<Input
			type="password"
			value={anthropicKey.current}
			placeholder="sk-ant-..."
			on:change={(event) => {
				anthropicKey.save((event.target as HTMLInputElement).value.trim())
			}}
			on:keydown={(event) => event.stopImmediatePropagation()}
		/>
	</label>
	<p class="text-gray-5">Used by the Scene Builder AI feature. Stored locally in your browser.</p>
</div>
