<script lang="ts">
	import { Keybindings } from '$lib/keybindings'
	import { PersistedState } from 'runed'
	import { useConnectionConfigs, useActiveConnectionConfig } from '$lib/hooks'
	import { X, Radio } from 'lucide-svelte'

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

<button
	class=" fixed right-0 bottom-0 z-10 p-2"
	type="button"
	onclick={() => (open.current = !open.current)}
>
	<Radio />
</button>

{#if open.current}
	<dialog
		open
		class="z-20 flex w-full items-start justify-between bg-white p-2"
	>
		<div class="flex flex-col gap-2">
			{#each connectionConfigs.current as config, index}
				<form class="flex flex-wrap items-center gap-2">
					<label class="label flex items-center gap-1.5 text-xs">
						<input
							class="checkbox"
							type="checkbox"
							checked={activeConfig.current?.partId === config.partId}
							onchange={(event) => {
								const { checked } = event.target as HTMLInputElement
								activeConfig.set(checked ? index : undefined)
							}}
						/>
						Active
					</label>

					<input
						bind:value={config.host}
						class="input max-w-72 text-xs"
						placeholder="Host"
					/>
					<input
						bind:value={config.partId}
						class="input max-w-72 text-xs"
						placeholder="Part ID"
					/>
					<input
						bind:value={config.apiKeyId}
						class="input max-w-72 text-xs"
						placeholder="API Key ID"
					/>
					<input
						bind:value={config.apiKeyValue}
						class="input max-w-72 text-xs"
						placeholder="API Key Value"
					/>
					<input
						bind:value={config.signalingAddress}
						class="input max-w-72 text-xs"
						placeholder="Signaling Address"
					/>
					<button
						type="button"
						class="btn preset-filled p-2 text-xs"
						onclick={() => {
							connectionConfigs.current.splice(index, 1)
						}}
					>
						Delete
					</button>
				</form>

				<div class="mt-2 mb-4 w-full border-b border-gray-300"></div>
			{/each}

			<button
				type="button"
				class="btn preset-filled"
				onclick={addConfig}>Add config</button
			>
		</div>

		<button onclick={() => (open.current = !open.current)}>
			<X />
		</button>
	</dialog>
{/if}
