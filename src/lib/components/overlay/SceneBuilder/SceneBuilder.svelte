<script lang="ts">
	import { Icon } from '@viamrobotics/prime-core'

	import { usePartConfig } from '$lib/hooks/usePartConfig.svelte'
	import { applyFrameDeltas, type AppliedChange, type FrameDelta, type UpdateError } from './frameDeltaAdapter'
	import { backendIP, websocketPort } from '$lib/defines'

	import FloatingPanel from '../FloatingPanel.svelte'

	type UIState = 'idle' | 'loading' | 'diff' | 'error'

	let isOpen = $state(false)
	let uiState: UIState = $state('idle')
	let prompt = $state('')
	let applied = $state<AppliedChange[]>([])
	let updateErrors = $state<UpdateError[]>([])
	let explanation = $state('')
	let errorMessage = $state('')

	const partConfig = usePartConfig()
	const canSubmit = $derived(prompt.trim().length > 0 && uiState === 'idle')

	async function submit() {
		uiState = 'loading'

		const components = partConfig.current.components
			.filter((c) => c.frame !== undefined)
			.map(({ name, frame }) => ({ name, frame }))

		try {
			const res = await fetch(`http://${backendIP}:${websocketPort}/scene-builder`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ prompt: prompt.trim(), components }),
			})

			if (!res.ok) {
				throw new Error(`${res.status}: ${await res.text()}`)
			}

			const data = (await res.json()) as { updates: FrameDelta[]; explanation: string }
			const result = applyFrameDeltas(data.updates, partConfig.current, {
				updateFrame: partConfig.updateFrame,
			})

			applied = result.applied
			updateErrors = result.errors
			explanation = data.explanation
			uiState = 'diff'
		} catch (err) {
			errorMessage = err instanceof Error ? err.message : String(err)
			uiState = 'error'
		}
	}

	function confirm() {
		applied = []
		updateErrors = []
		explanation = ''
		prompt = ''
		uiState = 'idle'
	}

	function revert() {
		partConfig.discardChanges()
		applied = []
		updateErrors = []
		explanation = ''
		prompt = ''
		uiState = 'idle'
	}

	function resetError() {
		errorMessage = ''
		uiState = 'idle'
	}
</script>

<button
	class="flex items-center gap-1 rounded border border-gray-300 bg-white px-2 py-1 text-xs hover:bg-gray-50"
	onclick={() => (isOpen = !isOpen)}
>
	<Icon
		name="robot-outline"
		size="sm"
	/>
	Frame Builder
</button>

<FloatingPanel
	bind:isOpen
	title="Frame Builder"
	defaultSize={{ width: 480, height: 420 }}
	resizable
>
	<div class="flex h-full flex-col gap-3 p-3 text-xs">
		<!-- prompt input -->
		<div class="flex gap-2">
			<textarea
				class="flex-1 resize-none rounded border border-gray-300 p-2 text-xs focus:outline-none focus:ring-1 focus:ring-gray-400 disabled:bg-gray-50 disabled:text-gray-400"
				placeholder="Describe the frame change, e.g. 'Move the arm 200mm forward along X'"
				rows={3}
				disabled={uiState === 'loading' || uiState === 'diff'}
				bind:value={prompt}
				onkeydown={(e) => {
					e.stopImmediatePropagation()
					if (e.key === 'Enter' && !e.shiftKey && canSubmit) {
						e.preventDefault()
						submit()
					}
				}}
			></textarea>
			<button
				class="self-end rounded bg-gray-800 px-3 py-1.5 text-xs text-white hover:bg-gray-700 disabled:cursor-not-allowed disabled:opacity-40"
				disabled={!canSubmit}
				onclick={submit}
			>
				Submit
			</button>
		</div>

		<!-- loading -->
		{#if uiState === 'loading'}
			<p class="text-gray-5 text-center">Thinking…</p>
		{/if}

		<!-- diff ready -->
		{#if uiState === 'diff'}
			{#if explanation}
				<p class="text-gray-6 italic">{explanation}</p>
			{/if}

			{#if applied.length > 0}
				<div class="overflow-auto rounded border border-gray-200">
					<table class="w-full text-left">
						<thead class="bg-gray-50">
							<tr>
								<th class="px-2 py-1 font-medium">Component</th>
								<th class="px-2 py-1 font-medium">Field</th>
								<th class="px-2 py-1 font-medium">Before</th>
								<th class="px-2 py-1 font-medium">After</th>
							</tr>
						</thead>
						<tbody>
							{#each applied as change (change.componentName + change.field)}
								<tr class="border-t border-gray-100">
									<td class="px-2 py-1 font-mono">{change.componentName}</td>
									<td class="px-2 py-1 font-mono">{change.field}</td>
									<td class="text-red-6 px-2 py-1 font-mono">{change.oldValue}</td>
									<td class="text-green-6 px-2 py-1 font-mono">{change.newValue}</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
			{:else}
				<p class="text-gray-5 text-center">No frame changes proposed.</p>
			{/if}

			{#if updateErrors.length > 0}
				<ul class="text-red-6 space-y-0.5">
					{#each updateErrors as err (err.componentName)}
						<li><span class="font-mono">{err.componentName}</span>: {err.reason}</li>
					{/each}
				</ul>
			{/if}

			<div class="mt-auto flex gap-2">
				<button
					class="rounded bg-gray-800 px-3 py-1.5 text-white hover:bg-gray-700"
					onclick={confirm}
				>
					Confirm
				</button>
				<button
					class="rounded border border-gray-300 px-3 py-1.5 hover:bg-gray-50"
					onclick={revert}
				>
					Revert
				</button>
			</div>
		{/if}

		<!-- error -->
		{#if uiState === 'error'}
			<p class="text-red-6">{errorMessage}</p>
			<button
				class="self-start rounded border border-gray-300 px-3 py-1.5 hover:bg-gray-50"
				onclick={resetError}
			>
				Try again
			</button>
		{/if}
	</div>
</FloatingPanel>
