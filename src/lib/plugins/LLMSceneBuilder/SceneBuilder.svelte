<script lang="ts">
	import { Portal } from '@threlte/extras'

	import DashboardButton from '$lib/components/overlay/dashboard/Button.svelte'
	import FloatingPanel from '$lib/components/overlay/FloatingPanel.svelte'

	import { useSceneBuilder } from './useSceneBuilder.svelte'

	const sceneBuilder = useSceneBuilder()

	let isOpen = $state(false)
	let prompt = $state('')

	const canSubmit = $derived(prompt.trim().length > 0 && sceneBuilder.uiState === 'idle')
</script>

<Portal id="dashboard">
	<fieldset>
		<DashboardButton
			active={isOpen}
			icon="robot-outline"
			description="Frame Builder"
			onclick={() => (isOpen = !isOpen)}
		/>
	</fieldset>
</Portal>

<Portal id="dom">
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
					class="flex-1 resize-none rounded border border-gray-300 p-2 text-xs focus:ring-1 focus:ring-gray-400 focus:outline-none disabled:bg-gray-50 disabled:text-gray-400"
					placeholder="Describe a frame change — translation, rotation, or parent. e.g. 'Move arm-1 200mm forward and rotate 90° left'"
					rows={3}
					disabled={sceneBuilder.uiState === 'loading' || sceneBuilder.uiState === 'diff'}
					bind:value={prompt}
					onkeydown={(e) => {
						e.stopImmediatePropagation()
						if (e.key === 'Enter' && !e.shiftKey && canSubmit) {
							e.preventDefault()
							sceneBuilder.submit(prompt)
							prompt = ''
						}
					}}
				></textarea>
				<button
					class="self-end rounded bg-gray-800 px-3 py-1.5 text-xs text-white hover:bg-gray-700 disabled:cursor-not-allowed disabled:opacity-40"
					disabled={!canSubmit}
					onclick={() => {
						sceneBuilder.submit(prompt)
						prompt = ''
					}}
				>
					Submit
				</button>
			</div>

			<!-- loading -->
			{#if sceneBuilder.uiState === 'loading'}
				<p class="text-gray-5 text-center">Thinking…</p>
			{/if}

			<!-- diff ready -->
			{#if sceneBuilder.uiState === 'diff'}
				{#if sceneBuilder.diffGroups.length > 0}
					<div class="flex flex-col gap-2 overflow-auto">
						{#each sceneBuilder.diffGroups as group (group.componentName)}
							<div class="rounded border border-gray-200">
								<div
									class="flex items-baseline gap-2 border-b border-gray-200 bg-gray-50 px-2 py-1"
								>
									<span class="font-mono font-medium">{group.componentName}</span>
									{#if group.explanation}
										<span class="text-gray-5 truncate italic">{group.explanation}</span>
									{/if}
								</div>
								<table class="w-full text-left">
									<thead class="sr-only">
										<tr>
											<th>Field</th>
											<th>Before</th>
											<th>After</th>
										</tr>
									</thead>
									<tbody>
										{#each group.changes as change (change.field)}
											<tr class="border-t border-gray-100 first:border-t-0">
												<td class="px-2 py-1 font-mono">{change.field}</td>
												<td class="text-red-6 px-2 py-1 font-mono">{change.oldValue}</td>
												<td class="text-green-6 px-2 py-1 font-mono">{change.newValue}</td>
											</tr>
										{/each}
									</tbody>
								</table>
							</div>
						{/each}
					</div>
				{:else}
					<p class="text-gray-5 text-center">No frame changes proposed.</p>
				{/if}

				{#if sceneBuilder.updateErrors.length > 0}
					<ul class="text-red-6 space-y-0.5">
						{#each sceneBuilder.updateErrors as err (err.componentName)}
							<li><span class="font-mono">{err.componentName}</span>: {err.reason}</li>
						{/each}
					</ul>
				{/if}

				<div class="mt-auto flex gap-2">
					<button
						class="rounded bg-gray-800 px-3 py-1.5 text-white hover:bg-gray-700"
						onclick={sceneBuilder.confirm}
					>
						Confirm
					</button>
					<button
						class="rounded border border-gray-300 px-3 py-1.5 hover:bg-gray-50"
						onclick={sceneBuilder.cancel}
					>
						Cancel
					</button>
				</div>
			{/if}

			<!-- error -->
			{#if sceneBuilder.uiState === 'error'}
				<p class="text-red-6">{sceneBuilder.errorMessage}</p>
				<button
					class="self-start rounded border border-gray-300 px-3 py-1.5 hover:bg-gray-50"
					onclick={sceneBuilder.resetError}
				>
					Try again
				</button>
			{/if}
		</div>
	</FloatingPanel>
</Portal>
