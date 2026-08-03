<script lang="ts">
	import { Badge } from '@viamrobotics/prime-core'
	import { PersistedState } from 'runed'

	import { WorkspacePortal } from '$lib'
	import DashboardButton from '$lib/components/overlay/dashboard/Button.svelte'
	import FloatingPanel from '$lib/components/overlay/FloatingPanel.svelte'

	import { provideLogs } from './useLogs.svelte'

	const logs = provideLogs()

	const isOpen = new PersistedState('logs-is-open', false)

	let levels = new PersistedState('logs-selected-levels', {
		info: true,
		warn: true,
		error: true,
	})
</script>

<WorkspacePortal>
	<fieldset class="relative">
		<DashboardButton
			active={isOpen.current}
			icon="article"
			description="Logs"
			onclick={() => {
				isOpen.current = !isOpen.current
			}}
		/>
		{#if logs.warnings.length > 0}
			<span
				class="absolute z-4 -mt-1.5 -ml-1.5 h-4 w-4 rounded-full bg-yellow-700 text-center text-[10px] text-white"
			>
				{logs.warnings.length}
			</span>
		{/if}

		{#if logs.errors.length > 0}
			<span
				class="absolute z-4 -mt-1.5 -ml-1.5 h-4 rounded-full bg-red-700 px-1.25 text-center text-[10px] text-white"
			>
				{logs.errors.length}
			</span>
		{/if}
	</fieldset>
</WorkspacePortal>

<FloatingPanel
	title="Logs"
	bind:isOpen={isOpen.current}
	defaultSize={{ width: 240, height: 315 }}
	resizable
>
	<div class="flex h-full flex-col">
		<div class="flex gap-1 px-3 py-2">
			<button
				type="button"
				class="group cursor-pointer rounded-full"
				aria-pressed={levels.current.error}
				onclick={() => {
					levels.current.error = !levels.current.error
				}}
			>
				<Badge
					label="error"
					variant={levels.current.error ? 'danger' : 'inactive'}
					cx="transition group-hover:brightness-95"
				/>
			</button>

			<button
				type="button"
				class="group cursor-pointer rounded-full"
				aria-pressed={levels.current.warn}
				onclick={() => {
					levels.current.warn = !levels.current.warn
				}}
			>
				<Badge
					label="warn"
					variant={levels.current.warn ? 'warning' : 'inactive'}
					cx="transition group-hover:brightness-95"
				/>
			</button>

			<button
				type="button"
				class="group cursor-pointer rounded-full"
				aria-pressed={levels.current.info}
				onclick={() => {
					levels.current.info = !levels.current.info
				}}
			>
				<Badge
					label="info"
					variant={levels.current.info ? 'neutral' : 'inactive'}
					cx="transition group-hover:brightness-95"
				/>
			</button>
		</div>

		<div class="flex flex-col gap-2 overflow-auto px-3 pb-3 text-xs">
			{#each logs.current as log (log.uuid)}
				{#if levels.current[log.level]}
					<div>
						<div class="flex flex-wrap items-center gap-1.5">
							<div
								class={[
									'h-2 w-2 rounded-full',
									{
										'bg-danger-dark': log.level === 'error',
										'bg-amber-300': log.level === 'warn',
										'bg-blue-400': log.level === 'info',
									},
								]}
							></div>
							<div class="text-subtle-2">{log.timestamp}</div>
						</div>
						<div>
							{#if log.count > 1}
								<span class="mr-1 rounded bg-green-700 px-1 py-0.5 text-xs text-white">
									{log.count}
								</span>
							{/if}
							{log.message}
						</div>
					</div>
				{/if}
			{:else}
				No logs
			{/each}
		</div>
	</div>
</FloatingPanel>
