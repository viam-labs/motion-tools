<script lang="ts">
	import { ToastVariant, useToast } from '@viamrobotics/prime-core'

	import { usePlanController } from '$lib/hooks/usePlanController.svelte'

	const toast = useToast()
	const planController = usePlanController()

	const onStep = async (direction: 'prev' | 'next') => {
		const result = await planController.stepPlan(direction)
		if (!result.ok) {
			toast({
				message: `Plan step failed: ${result.error}`,
				variant: ToastVariant.Danger,
			})
		}
	}
</script>

{#if planController.totalSteps > 0}
	<div
		class="pointer-events-auto fixed right-4 top-4 z-[10000] flex items-center gap-2 rounded bg-zinc-900/85 px-3 py-2 text-xs text-white"
	>
		<button
			type="button"
			class="rounded border border-zinc-600 px-2 py-1 disabled:opacity-40"
			onclick={() => onStep('prev')}
			disabled={planController.steppingPlan || planController.currentStep <= 0}
		>
			Prev
		</button>
		<span>
			Step {Math.max(planController.currentStep, 0) + 1} / {planController.totalSteps}
		</span>
		<button
			type="button"
			class="rounded border border-zinc-600 px-2 py-1 disabled:opacity-40"
			onclick={() => onStep('next')}
			disabled={planController.steppingPlan ||
				planController.currentStep >= planController.totalSteps - 1}
		>
			Next
		</button>
	</div>
{/if}
