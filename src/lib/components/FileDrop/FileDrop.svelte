<script lang="ts">
	import { ToastVariant, useToast } from '@viamrobotics/prime-core'

	import { useDrawConnectionConfig } from '$lib/hooks/useDrawConnectionConfig.svelte'
	import { usePartID } from '$lib/hooks/usePartID.svelte'

	import CloudPlanPicker from './CloudPlanPicker.svelte'
	import type { FileDropperSuccess } from './file-dropper'
	import { createPlanRequestDropper } from './plan-request-dropper'

	const toast = useToast()
	const drawConnectionConfig = useDrawConnectionConfig()
	const partID = usePartID()
	const drawServerURL = $derived(
		drawConnectionConfig.current?.backendIP
			? `http://${drawConnectionConfig.current.backendIP}:3030`
			: 'http://localhost:3030'
	)

	let totalPlanSteps = $state(0)
	let currentPlanStep = $state(-1)
	let steppingPlan = $state(false)

	const planRequestDropper = $derived(createPlanRequestDropper(drawServerURL))

	const stepPlan = async (direction: 'prev' | 'next') => {
		if (steppingPlan || totalPlanSteps <= 0) return
		steppingPlan = true
		try {
			const resp = await fetch(`${drawServerURL}/plan-request/step`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ direction }),
			})
			if (!resp.ok) {
				const text = await resp.text()
				throw new Error(text || 'failed to step plan')
			}

			const body = (await resp.json()) as { current_step: number; total_steps: number }
			currentPlanStep = body.current_step ?? currentPlanStep
			totalPlanSteps = body.total_steps ?? totalPlanSteps
		} catch (error) {
			toast({
				message: `Plan step failed: ${error instanceof Error ? error.message : 'unknown error'}`,
				variant: ToastVariant.Danger,
			})
		} finally {
			steppingPlan = false
		}
	}

	function handleResult(result: FileDropperSuccess) {
		totalPlanSteps = result.totalSteps
		currentPlanStep = result.currentStep
		toast({ message: `${result.name} loaded.`, variant: ToastVariant.Success })
	}
</script>

{#if totalPlanSteps > 0}
	<div
		class="pointer-events-auto fixed right-4 top-4 z-[10000] flex items-center gap-2 rounded bg-zinc-900/85 px-3 py-2 text-xs text-white"
	>
		<button
			type="button"
			class="rounded border border-zinc-600 px-2 py-1 disabled:opacity-40"
			onclick={() => stepPlan('prev')}
			disabled={steppingPlan || currentPlanStep <= 0}
		>
			Prev
		</button>
		<span>Step {Math.max(currentPlanStep, 0) + 1} / {totalPlanSteps}</span>
		<button
			type="button"
			class="rounded border border-zinc-600 px-2 py-1 disabled:opacity-40"
			onclick={() => stepPlan('next')}
			disabled={steppingPlan || currentPlanStep >= totalPlanSteps - 1}
		>
			Next
		</button>
	</div>
{/if}

{#if partID.current}
	<div class="pointer-events-none fixed right-4 top-16 z-[10000]">
		<CloudPlanPicker
			partId={partID.current}
			{planRequestDropper}
			onResult={handleResult}
			onError={(message) => toast({ message, variant: ToastVariant.Danger })}
		/>
	</div>
{/if}
