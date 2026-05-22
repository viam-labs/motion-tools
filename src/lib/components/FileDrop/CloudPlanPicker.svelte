<script lang="ts">
	import { createViamClient, dataApi, type ViamClient } from '@viamrobotics/sdk'

	import type { DebugConfig } from '$lib/hooks/useDebugConfig.svelte'

	import type { FileDropper, FileDropperSuccess } from './file-dropper'

	type BinaryData = dataApi.BinaryData

	interface Props {
		debugConfig: DebugConfig
		planRequestDropper: FileDropper
		onResult: (result: FileDropperSuccess) => void
		onError: (message: string) => void
	}

	const { debugConfig, planRequestDropper, onResult, onError }: Props = $props()

	const clientPromise = $derived(
		createViamClient({
			serviceHost: 'https://app.viam.com',
			credentials: {
				type: 'api-key',
				authEntity: debugConfig.apiKeyId,
				payload: debugConfig.apiKeyValue,
			},
		})
	)

	let open = $state(false)
	let loading = $state(false)
	let items = $state<BinaryData[]>([])
	let loaded = $state(false)
	let selectedId = $state('')
	let fetching = $state(false)

	// Reset cached listing when the debug config changes.
	$effect(() => {
		// eslint-disable-next-line @typescript-eslint/no-unused-expressions
		debugConfig.partId
		debugConfig.apiKeyId
		debugConfig.apiKeyValue
		loaded = false
		items = []
		selectedId = ''
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
		if (!debugConfig.partId) {
			onError('Debug config is missing a part ID.')
			return
		}
		loading = true
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
			if (items.length > 0 && !selectedId) {
				selectedId = idOf(items[0]!)
			}
		} catch (error) {
			onError(
				`Could not list cloud data: ${error instanceof Error ? error.message : 'unknown error'}`
			)
		} finally {
			loading = false
		}
	}

	const toggle = () => {
		open = !open
		if (open && !loaded && !loading) {
			void refresh()
		}
	}

	const load = async () => {
		if (!selectedId) return
		const item = items.find((entry) => idOf(entry) === selectedId)
		if (!item) return

		fetching = true
		try {
			const client: ViamClient = await clientPromise
			const fetched = await client.dataClient.binaryDataByIds([selectedId], true)
			const bytes = fetched[0]?.binary
			if (!bytes || bytes.length === 0) {
				onError('Selected file is empty.')
				return
			}
			const content = new TextDecoder().decode(bytes)
			const name = fileNameOf(item)
			const result = await planRequestDropper({ name, content })
			if (result.success) {
				onResult(result)
				open = false
			} else {
				onError(result.error.message)
			}
		} catch (error) {
			onError(
				`Could not load cloud file: ${error instanceof Error ? error.message : 'unknown error'}`
			)
		} finally {
			fetching = false
		}
	}
</script>

<div class="pointer-events-auto flex flex-col items-end gap-2">
	<button
		type="button"
		class="rounded border border-zinc-600 bg-zinc-900/85 px-2 py-1 text-xs text-white disabled:opacity-40"
		onclick={toggle}
		disabled={!debugConfig.partId}
		title={debugConfig.partId ? 'Load plan from cloud data' : 'No debug config selected'}
	>
		{open ? 'Hide cloud plans' : 'Load plan from cloud…'}
	</button>

	{#if open}
		<div
			class="flex w-72 flex-col gap-2 rounded border border-zinc-700 bg-zinc-900/95 p-2 text-xs text-white shadow-lg"
		>
			<div class="flex items-center justify-between gap-2">
				<div class="flex flex-col">
					<span class="font-medium">Recent JSON data</span>
					{#if debugConfig.host}
						<span class="text-[10px] text-zinc-400">{debugConfig.host}</span>
					{/if}
				</div>
				<button
					type="button"
					class="rounded border border-zinc-600 px-1.5 py-0.5 disabled:opacity-40"
					onclick={refresh}
					disabled={loading}
				>
					{loading ? 'Loading…' : 'Refresh'}
				</button>
			</div>

			{#if loading && items.length === 0}
				<div class="text-zinc-400">Fetching…</div>
			{:else if loaded && items.length === 0}
				<div class="text-zinc-400">No JSON data found for this part.</div>
			{:else}
				<select
					class="rounded border border-zinc-600 bg-zinc-800 px-1 py-1 text-white"
					bind:value={selectedId}
					disabled={loading || fetching}
				>
					{#each items as item (idOf(item))}
						<option value={idOf(item)}>{fileNameOf(item)}</option>
					{/each}
				</select>
				<button
					type="button"
					class="self-end rounded border border-zinc-600 px-2 py-1 disabled:opacity-40"
					onclick={load}
					disabled={!selectedId || fetching}
				>
					{fetching ? 'Loading…' : 'Load plan'}
				</button>
			{/if}
		</div>
	{/if}
</div>
