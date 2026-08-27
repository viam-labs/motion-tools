<script lang="ts">
	import { Badge } from '@viamrobotics/prime-core'
	import { PersistedState } from 'runed'

	import DashboardButton from '$lib/components/overlay/dashboard/Button.svelte'
	import Popover from '$lib/components/overlay/Popover.svelte'
	import WorkspacePortal from '$lib/components/overlay/Portals/WorkspacePortal.svelte'

	import { provideLogs } from './useLogs.svelte'

	const logs = provideLogs()

	let levels = new PersistedState('logs-selected-levels', {
		info: true,
		warn: true,
		error: true,
	})
</script>

<WorkspacePortal>
	<fieldset class="relative">
		<Popover placement="bottom-end">
			{#snippet trigger(triggerProps, { isOpen })}
				<DashboardButton
					{...triggerProps}
					active={isOpen}
					icon="article"
					description="Logs"
				/>
			{/snippet}

			<div
				class="font-public-sans flex max-h-[420px] w-80 flex-col overflow-y-auto overscroll-contain"
			>
				<div class="sticky top-0 z-1 flex gap-1 bg-white px-3 py-2">
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

				<div class="flex flex-col gap-2 px-3 pb-3 text-xs">
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
		</Popover>

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
