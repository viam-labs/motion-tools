<script lang="ts">
	import { Icon, Tab, TabsBar } from '@viamrobotics/prime-core'
	import { MachineConnectionEvent } from '@viamrobotics/sdk'

	import FloatingPanel from '$lib/components/overlay/FloatingPanel.svelte'

	import {
		useActiveConnectionConfig,
		useConnectionConfigs,
	} from '../hooks/useConnectionConfigs.svelte'
	import {
		useActiveDebugConfig,
		useDebugConfigs,
	} from '../hooks/useDebugConfigs.svelte'
	import { useMachineConnection } from '../hooks/useMachineConnection.svelte'
	import ConfigList from './ConfigList.svelte'
	import DebugConfigPicker from './DebugConfigPicker.svelte'

	interface Props {
		isOpen: boolean
	}

	let { isOpen = $bindable(false) }: Props = $props()

	const connectionConfigs = useConnectionConfigs()
	const activeConfig = useActiveConnectionConfig()
	const debugConfigs = useDebugConfigs()
	const activeDebugConfig = useActiveDebugConfig()
	const machineConnection = useMachineConnection()

	let activeTab = $state<'connection' | 'debug'>('connection')
	const connected = $derived(
		machineConnection.connectionStatus === MachineConnectionEvent.CONNECTED
	)
	const disconnected = $derived(
		machineConnection.connectionStatus === MachineConnectionEvent.DISCONNECTED ||
			machineConnection.connectionStatus === MachineConnectionEvent.RECONNECTION_FAILED
	)
	const text = $derived.by(() => {
		switch (machineConnection.connectionStatus) {
			case MachineConnectionEvent.CONNECTING:
			case MachineConnectionEvent.DIALING: {
				return 'connecting...'
			}
			case MachineConnectionEvent.RECONNECTING: {
				return 'reconnecting...'
			}
			case MachineConnectionEvent.CONNECTED: {
				return 'live'
			}
			case MachineConnectionEvent.DISCONNECTED:
			case MachineConnectionEvent.RECONNECTION_FAILED: {
				return 'offline'
			}
			default: {
				return 'connect'
			}
		}
	})

	const onpaste = (event: ClipboardEvent) => {
		try {
			const config = JSON.parse(event.clipboardData?.getData('text') ?? '')

			if (activeTab === 'debug') {
				if (
					'partId' in config &&
					'apiKeyId' in config &&
					'apiKeyValue' in config
				) {
					debugConfigs.add({
						name: config.name ?? config.host ?? '',
						partId: config.partId,
						apiKeyId: config.apiKeyId,
						apiKeyValue: config.apiKeyValue,
					})
				}
			} else if (
				'host' in config &&
				'partId' in config &&
				'apiKeyId' in config &&
				'apiKeyValue' in config &&
				'signalingAddress' in config
			) {
				connectionConfigs.add(config)
			}
		} catch {
			// Do nothing
		}
	}
</script>

<svelte:window {onpaste} />

<!--
	Always-mounted headless pickers: keep auto-refresh + auto-load running even
	when the FloatingPanel (which unmounts children on close) is closed.
	The visible pickers inside the panel handle interactive selection.
-->
<div class="hidden">
	{#each debugConfigs.current as config, index}
		<DebugConfigPicker
			debugConfig={config}
			isActive={index === activeDebugConfig.activeIndex}
		/>
	{/each}
</div>

<fieldset>
	<div class="text-default relative">
		<div class="flex items-center">
			{#if machineConnection.isAwaitingRetry}
				<button
					aria-label="Machine connection configs"
					class="border-danger-medium bg-danger-light text-danger-dark flex items-center gap-2 rounded-l border border-r-0 px-2.5 py-1.5 text-xs hover:bg-[#F8E1DF] focus:bg-[#F8E1DF]"
					onclick={() => {
						isOpen = !isOpen
					}}
				>
					<Icon name="broadcast-off" />
					<span class="truncate whitespace-nowrap"
						>Retry in {machineConnection.secondsUntilRetry}s...</span
					>
					<Icon name="chevron-{isOpen ? 'up' : 'down'}" />
				</button>
				<button
					aria-label="Reconnect now"
					class="border-danger-medium bg-danger-light text-danger-dark flex items-center rounded-r border px-2 py-1.5 text-xs hover:bg-[#F8E1DF] focus:bg-[#F8E1DF]"
					onclick={machineConnection.retryNow}
				>
					<Icon name="refresh" />
				</button>
			{:else}
				<button
					aria-label="Machine connection configs"
					class={[
						'flex items-center gap-2 rounded border px-2.5 py-1.5 text-xs',
						{
							'border-gray-5 bg-white': !connected && !disconnected,
							'border-success-medium bg-success-light text-success-dark hover:bg-[#D6F2D9] focus:bg-[#D6F2D9]':
								connected,
							'border-danger-medium bg-danger-light text-danger-dark hover:bg-[#F8E1DF] focus:bg-[#F8E1DF]':
								disconnected,
						},
					]}
					onclick={() => {
						isOpen = !isOpen
					}}
				>
					<Icon name={disconnected ? 'broadcast-off' : 'broadcast'} />
					<span class="truncate whitespace-nowrap capitalize">{text}</span>
					<Icon name="chevron-{isOpen ? 'up' : 'down'}" />
				</button>
			{/if}
		</div>
	</div>
</fieldset>

<FloatingPanel
	title="Connection configurations"
	defaultSize={{ width: 480, height: 400 }}
	bind:isOpen
>
	<div class="flex h-full flex-col">
		<div class="border-medium border-b px-2 pt-2">
			<TabsBar variant="secondary">
				<Tab
					title="Live"
					selected={activeTab === 'connection'}
					selectTab={() => {
						activeTab = 'connection'
					}}
				/>
				<Tab
					title="Debug"
					selected={activeTab === 'debug'}
					selectTab={() => {
						activeTab = 'debug'
					}}
				/>
			</TabsBar>
		</div>

		{#if activeTab === 'connection'}
			<ConfigList
				idPrefix="connection"
				configs={connectionConfigs.current}
				activeIndex={activeConfig.current
					? connectionConfigs.current.findIndex(
							(config) => config.partId === activeConfig.current?.partId
						)
					: -1}
				setActive={(index) => activeConfig.set(index)}
				onAdd={() => connectionConfigs.add()}
				onRemove={(index) => connectionConfigs.remove(index)}
				isReadonly={(config) => connectionConfigs.isEnvConfig(config)}
			/>
		{:else}
			<ConfigList
				idPrefix="debug"
				configs={debugConfigs.current}
				activeIndex={activeDebugConfig.activeIndex}
				setActive={(index) => activeDebugConfig.set(index)}
				onAdd={() => debugConfigs.add()}
				onRemove={(index) => debugConfigs.remove(index)}
				topFieldKey="name"
				topFieldLabel="Name"
				showSignalingAddress={false}
			>
				{#snippet extra(config, index)}
					<DebugConfigPicker
						debugConfig={config}
						isActive={index === activeDebugConfig.activeIndex}
					/>
				{/snippet}
			</ConfigList>
		{/if}
	</div>
</FloatingPanel>
