<script lang="ts">
	import { useLogs } from '$lib/hooks/useLogs.svelte'
	import Drawer from './Drawer.svelte'

	const logs = useLogs()
	const truncated = $derived(logs.current.slice(0, 100).reverse())
</script>

<Drawer name="Logs">
	<div class="flex h-64 w-60 flex-col gap-2 overflow-auto p-3">
		{#each truncated as log (log.uuid)}
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
				<div>{log.message}</div>
			</div>
		{:else}
			No logs
		{/each}
	</div>
</Drawer>
