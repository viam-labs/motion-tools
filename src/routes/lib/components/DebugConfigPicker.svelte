<script lang="ts">
	import { PersistedState } from 'runed'

	import { createViamClient, dataApi, type ViamClient } from '@viamrobotics/sdk'

	import { usePlanController } from '$lib/hooks/usePlanController.svelte'

	import type { DebugConfig } from '../hooks/useDebugConfigs.svelte'

	type BinaryData = dataApi.BinaryData

	interface Props {
		debugConfig: DebugConfig
	}

	const { debugConfig }: Props = $props()

	const planController = usePlanController()

	const ready = $derived(
		Boolean(debugConfig.partId && debugConfig.apiKeyId && debugConfig.apiKeyValue)
	)

	const clientPromise = $derived(
		ready
			? createViamClient({
					serviceHost: 'https://app.viam.com',
					credentials: {
						type: 'api-key',
						authEntity: debugConfig.apiKeyId,
						payload: debugConfig.apiKeyValue,
					},
				})
			: undefined
	)

	let loading = $state(false)
	let loaded = $state(false)
	let items = $state<BinaryData[]>([])
	const persistedSelection = $derived(
		new PersistedState<string>(`debug-plan-selection-${debugConfig.partId}`, '')
	)
	let fetching = $state(false)
	let errorMessage = $state('')

	// Reset cached listing when the debug config identity changes.
	$effect(() => {
		// eslint-disable-next-line @typescript-eslint/no-unused-expressions
		debugConfig.partId
		debugConfig.apiKeyId
		debugConfig.apiKeyValue
		loaded = false
		items = []
		errorMessage = ''
	})

	// Auto-refresh the plan list whenever credentials are ready.
	$effect(() => {
		if (ready && !loaded && !loading) {
			void refresh()
		}
	})

	const fileNameOf = (item: BinaryData): string => {
		const meta = item.metadata
		if (!meta) return '(unknown)'
		const name = meta.fileName || meta.binaryDataId || meta.id || '(unknown)'
		return meta.fileExt && !name.endsWith(meta.fileExt) ? `${name}${meta.fileExt}` : name
	}

	const idOf = (item: BinaryData): string =>
		item.metadata?.binaryDataId ?? item.metadata?.id ?? ''

	const refresh = async () => {
		if (!clientPromise || !debugConfig.partId) return
		loading = true
		errorMessage = ''
		try {
			const client: ViamClient = await clientPromise
			const resp = await client.dataClient.binaryDataByFilter(
				{ partId: debugConfig.partId, mimeType: ['application/json'] } as dataApi.Filter,
				50,
				undefined,
				'',
				false
			)
			items = resp.data
			loaded = true
			if (items.length > 0 && !persistedSelection.current) {
				persistedSelection.current = idOf(items[0]!)
			}
		} catch (error) {
			errorMessage = `Could not list cloud data: ${
				error instanceof Error ? error.message : 'unknown error'
			}`
		} finally {
			loading = false
		}
	}

	const load = async () => {
		const id = persistedSelection.current
		if (!clientPromise || !id) return
		const item = items.find((entry) => idOf(entry) === id)
		if (!item) return

		fetching = true
		errorMessage = ''
		try {
			const client: ViamClient = await clientPromise
			const fetched = await client.dataClient.binaryDataByIds([id], true)
			const bytes = fetched[0]?.binary
			if (!bytes || bytes.length === 0) {
				errorMessage = 'Selected file is empty.'
				return
			}
			const content = new TextDecoder().decode(bytes)
			const name = fileNameOf(item)
			const prefix = debugConfig.name ? `${debugConfig.name}/` : ''
			const result = await planController.loadPlan(name, content, prefix)
			if (!result.success) {
				errorMessage = result.error.message
			}
		} catch (error) {
			errorMessage = `Could not load cloud file: ${
				error instanceof Error ? error.message : 'unknown error'
			}`
		} finally {
			fetching = false
		}
	}

	let lastLoadedId = $state('')
	$effect(() => {
		const id = persistedSelection.current
		// Also track items.length so this re-fires when the list populates after
		// an auto-refresh, allowing the persisted selection to be loaded.
		const hasItems = items.length > 0
		if (hasItems && id && id !== lastLoadedId && !fetching) {
			lastLoadedId = id
			void load()
		}
	})
</script>

<div class="flex flex-col gap-1 pt-1">
	<div class="flex items-center gap-2">
		<select
			class="min-w-0 grow basis-0 truncate rounded border border-gray-300 bg-white px-1 py-1 text-xs disabled:opacity-40"
			bind:value={persistedSelection.current}
			disabled={!ready || loading || fetching || items.length === 0}
		>
			{#if items.length === 0}
				<option value="">
					{#if !ready}
						Fill out config to enable
					{:else if loading}
						Loading…
					{:else if loaded}
						No JSON data found
					{:else}
						Refresh to list plans
					{/if}
				</option>
			{:else}
				{#each items as item (idOf(item))}
					<option value={idOf(item)}>{fileNameOf(item)}</option>
				{/each}
			{/if}
		</select>

		<button
			type="button"
			class="rounded border border-gray-300 px-2 py-1 text-xs disabled:opacity-40"
			onclick={refresh}
			disabled={!ready || loading}
			title="Refresh plan list"
		>
			{loading ? '…' : 'Refresh'}
		</button>

		{#if fetching}
			<span class="text-[10px] text-gray-600">Loading…</span>
		{/if}
	</div>

	{#if errorMessage}
		<div class="text-danger-dark text-[10px]">{errorMessage}</div>
	{/if}
</div>
