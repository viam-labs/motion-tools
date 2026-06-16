<script lang="ts">
	import { untrack } from 'svelte'

	import type { PlanFileDropSuccess } from '$lib/components/FileDrop/file-dropper'

	import { useFileDrop } from '$lib/components/FileDrop/useFileDrop.svelte'

	import { useMotionPlanReplayer } from './useMotionPlanReplayer.svelte'

	interface Props {
		/** When true, drag-and-drop and remove buttons are hidden (app-embedded mode). */
		appEmbedded?: boolean
	}

	const { appEmbedded = false }: Props = $props()

	const ctx = useMotionPlanReplayer()

	// `appEmbedded` is a fixed initialization prop — intentionally captured once.
	const fileDrop = untrack(() => appEmbedded)
		? null
		: useFileDrop(
				(result) => {
					if (result.type !== 'plan') return
					const r = result as PlanFileDropSuccess
					ctx.addPlan(r.name, r.content, r.snapshots)
				},
				() => {}
			)
</script>

<!-- svelte:window must be at component top level, not inside a block -->
<svelte:window
	ondragenter={fileDrop?.ondragenter}
	ondragleave={fileDrop?.ondragleave}
	ondragover={fileDrop?.ondragover}
/>

<div class="flex flex-col gap-1 p-2 text-xs">
	<div class="font-medium text-gray-700">Motion Plans</div>

	{#if ctx.plans.length === 0 && !appEmbedded}
		<div class="py-2 text-center text-gray-400">Drop a plan JSON file to load</div>
	{/if}

	{#each ctx.plans as plan, i (plan.entry.name)}
		{@const isActive = ctx.activePlanIndex === i}
		<div
			class={[
				'flex cursor-pointer items-center gap-1 rounded px-2 py-1',
				isActive ? 'bg-blue-100 font-medium' : 'hover:bg-gray-100',
			]}
			role="button"
			tabindex="0"
			onclick={() => void ctx.selectPlan(i)}
			onkeydown={(e) => e.key === 'Enter' && void ctx.selectPlan(i)}
		>
			<span class="mr-1 text-gray-400">{isActive ? '●' : '○'}</span>
			<span class="grow truncate">{plan.entry.name}</span>

			{#if plan.status === 'loading'}
				<span class="text-gray-400">…</span>
			{/if}

			{#if !appEmbedded}
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
			{/if}
		</div>

		{#if plan.status === 'error'}
			<div class="pl-5 text-[10px] text-red-600">{plan.error}</div>
		{/if}
		{#if plan.status === 'no-trajectory'}
			<div class="pl-5 text-[10px] text-yellow-600">No trajectory — nothing to replay</div>
		{/if}
	{/each}
</div>

{#if fileDrop && fileDrop.dropState !== 'inactive'}
	<div
		class="fixed inset-0 z-[9999] bg-black/10"
		role="region"
		aria-label="File drop zone"
		ondrop={fileDrop.ondrop}
	></div>
{/if}
