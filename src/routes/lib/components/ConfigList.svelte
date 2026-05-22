<script lang="ts" generics="T extends ConfigShape">
	import { Button, IconButton, Input, Switch } from '@viamrobotics/prime-core'
	import type { Snippet } from 'svelte'

	import type { ConfigShape } from './config-shape'
	import Collapsible from './Collapsible.svelte'

	interface Props {
		configs: T[]
		activeIndex: number
		setActive: (index: number | undefined) => void
		onAdd: () => void
		onRemove: (index: number) => void
		isReadonly?: (config: T) => boolean
		idPrefix: string
		topFieldKey?: 'host' | 'name'
		topFieldLabel?: string
		showSignalingAddress?: boolean
		extra?: Snippet<[T, number]>
	}

	const {
		configs,
		activeIndex,
		setActive,
		onAdd,
		onRemove,
		isReadonly,
		idPrefix,
		topFieldKey = 'host',
		topFieldLabel = 'Host',
		showSignalingAddress = true,
		extra,
	}: Props = $props()
</script>

<div class="flex h-full grow flex-col gap-2 overflow-y-auto p-2">
	{#each configs as config, index (`${idPrefix}-${index}`)}
		<form class="flex flex-col gap-2">
			<div class="flex justify-between gap-2">
				<Switch
					on={activeIndex === index}
					on:change={(event) => {
						setActive(event.detail ? index : undefined)
					}}
				/>

				<Input
					class="input w-full grow text-xs"
					placeholder={topFieldLabel}
					value={config[topFieldKey] ?? ''}
					on:change={(event) => {
						configs[index][topFieldKey] = (event.target as HTMLInputElement).value
					}}
				/>

				{#if !isReadonly?.(config)}
					<Button onclick={() => onRemove(index)}>Delete</Button>
				{/if}

				<IconButton
					icon="content-copy"
					label="Copy config"
					onclick={() => {
						navigator.clipboard.writeText(JSON.stringify(configs[index]))
					}}
				/>
			</div>

			<Collapsible>
				<div class="grid grid-cols-3 items-center gap-2 pt-2">
					<label
						for="{idPrefix}-{index}-partId"
						class="text-xs">Part ID</label
					>
					<div class="col-span-2">
						<Input
							id="{idPrefix}-{index}-partId"
							placeholder="Part ID"
							value={config.partId}
							on:change={(event) => {
								configs[index].partId = (event.target as HTMLInputElement).value
							}}
						/>
					</div>

					<label
						for="{idPrefix}-{index}-apiKeyId"
						class="text-xs">API key ID</label
					>
					<div class="col-span-2">
						<Input
							id="{idPrefix}-{index}-apiKeyId"
							placeholder="API key ID"
							value={config.apiKeyId}
							on:change={(event) => {
								configs[index].apiKeyId = (event.target as HTMLInputElement).value
							}}
						/>
					</div>

					<label
						for="{idPrefix}-{index}-apiKeyValue"
						class="text-xs">API key value</label
					>
					<div class="col-span-2">
						<Input
							id="{idPrefix}-{index}-apiKeyValue"
							placeholder="API key value"
							value={config.apiKeyValue}
							on:change={(event) => {
								configs[index].apiKeyValue = (event.target as HTMLInputElement).value
							}}
						/>
					</div>

					{#if showSignalingAddress}
						<label
							for="{idPrefix}-{index}-address"
							class="text-xs">Signaling address</label
						>
						<div class="col-span-2">
							<Input
								id="{idPrefix}-{index}-address"
								placeholder="Signaling address"
								value={config.signalingAddress ?? ''}
								on:change={(event) => {
									configs[index].signalingAddress = (event.target as HTMLInputElement).value
								}}
							/>
						</div>
					{/if}
				</div>
			</Collapsible>
		</form>

		{@render extra?.(config, index)}

		<div class="mt-2 mb-2 w-full border-b border-gray-300"></div>
	{/each}
</div>

<div class="border-medium flex w-full justify-center border-t bg-white p-2">
	<Button
		icon="plus"
		onclick={onAdd}
	>
		Add config
	</Button>
</div>
