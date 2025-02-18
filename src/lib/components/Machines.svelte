<script lang="ts">
	import { Keybindings } from '$lib/keybindings'
	import { PersistedState } from 'runed'
	import { useConnectionConfigs, useActiveConnectionConfig } from '$lib/hooks'

	const connectionConfigs = useConnectionConfigs()
	const activeConfig = useActiveConnectionConfig()

	let open = new PersistedState('machine-connection-config-open', false)

	const onkeydown = ({ key }: KeyboardEvent) => {
		if (key.toLowerCase() === Keybindings.MACHINES) {
			open.current = !open.current
		}
	}

	const addConfig = () => {
		connectionConfigs.current.push({
			host: '',
			partId: '',
			apiKeyId: '',
			apiKeyValue: '',
			signalingAddress: '',
		})
	}
</script>

<svelte:window {onkeydown} />

{#if open.current}
	<dialog
		open
		class="z-10 flex flex-col gap-2 p-2"
	>
		{#each connectionConfigs.current as config, index}
			<form class="flex flex-wrap items-center gap-2">
				<label class="flex items-center gap-1.5">
					<input
						type="checkbox"
						checked={activeConfig.current?.partId === config.partId}
						onchange={() => activeConfig.set(index)}
					/>
					Active
				</label>

				<input
					bind:value={config.host}
					class="input"
					placeholder="Host"
				/>
				<input
					bind:value={config.partId}
					class="input"
					placeholder="Part ID"
				/>
				<input
					bind:value={config.apiKeyId}
					class="input"
					placeholder="API Key ID"
				/>
				<input
					bind:value={config.apiKeyValue}
					class="input"
					placeholder="API Key Value"
				/>
				<input
					bind:value={config.signalingAddress}
					class="input"
					placeholder="Signaling Address"
				/>
				<button
					type="button"
					class="btn preset-filled"
					onclick={() => {
						connectionConfigs.current.splice(index, 1)
					}}
				>
					Delete
				</button>
			</form>
		{/each}

		<button
			type="button"
			class="btn preset-filled"
			onclick={addConfig}>Add config</button
		>
	</dialog>
{/if}
