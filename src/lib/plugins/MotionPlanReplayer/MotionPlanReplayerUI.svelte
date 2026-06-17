<script lang="ts">
	import { Portal } from '@threlte/extras'

	import type { PlanFileDropSuccess } from '$lib/components/FileDrop/file-dropper'

	import DashboardButton from '$lib/components/overlay/dashboard/Button.svelte'
	import FloatingPanel from '$lib/components/overlay/FloatingPanel.svelte'

	import { useMotionPlanReplayer } from './useMotionPlanReplayer.svelte'

	const ctx = useMotionPlanReplayer()

	let isOpen = $state(false)

	$effect(() => {
		const handle = (e: Event) => {
			const { name, content, snapshots } = (e as CustomEvent<PlanFileDropSuccess>).detail
			console.debug('[MotionPlanReplayer] received plan-loaded', name, snapshots.length, 'steps')
			ctx.addPlan(name, content, snapshots)
			console.debug('[MotionPlanReplayer] plans after add:', ctx.plans.length)
			isOpen = true
		}
		window.addEventListener('viam:plan-loaded', handle)
		return () => window.removeEventListener('viam:plan-loaded', handle)
	})
</script>

<Portal id="dashboard">
	<fieldset>
		<DashboardButton
			active={isOpen}
			icon="play-circle-outline"
			description="Motion Plan Replayer"
			onclick={() => (isOpen = !isOpen)}
		/>
	</fieldset>
</Portal>

<Portal id="dom">
	<FloatingPanel
		bind:isOpen
		title="Motion Plan Replayer"
		defaultSize={{ width: 320, height: 260 }}
	>
		<div class="flex h-full flex-col gap-1 p-2 text-xs">
			{#if ctx.plans.length === 0}
				<div class="flex grow items-center justify-center text-center text-gray-400">
					Drop a plan JSON file onto the canvas
				</div>
			{/if}

			{#each ctx.plans as plan, i (plan.name)}
				{@const isActive = ctx.activePlanIndex === i}
				<div
					class={[
						'flex cursor-pointer items-center gap-1 rounded px-2 py-1',
						isActive ? 'bg-blue-100 font-medium' : 'hover:bg-gray-100',
					]}
					role="button"
					tabindex="0"
					onclick={() => (isActive ? ctx.clearActivePlan() : ctx.selectPlan(i))}
					onkeydown={(e) => e.key === 'Enter' && (isActive ? ctx.clearActivePlan() : ctx.selectPlan(i))}
				>
					<span class="mr-1 text-gray-400">{isActive ? '●' : '○'}</span>
					<span class="grow truncate">{plan.name}</span>

					<button
						type="button"
						class="ml-1 rounded px-1 text-gray-400 hover:text-red-500"
						onclick={(e) => {
							e.stopPropagation()
							ctx.removePlan(i)
						}}
						aria-label="Remove plan"
						title="Remove plan">×</button
					>
				</div>

				{#if plan.status === 'error'}
					<div class="pl-5 text-[10px] text-red-600">{plan.error}</div>
				{/if}
				{#if plan.status === 'no-trajectory'}
					<div class="pl-5 text-[10px] text-yellow-600">No trajectory — nothing to replay</div>
				{/if}
			{/each}
		</div>
	</FloatingPanel>
</Portal>
