<script lang="ts">
	import { ToastVariant, useToast } from '@viamrobotics/prime-core'

	import { usePlanController } from '$lib/hooks/usePlanController.svelte'

	const STEP_INTERVAL_MS = 100

	const toast = useToast()
	const planController = usePlanController()

	let isPlaying = $state(false)
	let intervalId: ReturnType<typeof setInterval> | undefined
	let scrubberEl: HTMLInputElement | undefined = $state()

	const lastStepIdx = $derived(Math.max(0, planController.totalSteps - 1))
	const displayStep = $derived(Math.max(planController.currentStep, 0))
	const atEnd = $derived(planController.currentStep >= lastStepIdx)

	const reportError = (error: string) => {
		toast({
			message: `Plan step failed: ${error}`,
			variant: ToastVariant.Danger,
		})
	}

	const pause = () => {
		isPlaying = false
		if (intervalId !== undefined) {
			clearInterval(intervalId)
			intervalId = undefined
		}
	}

	const play = () => {
		if (isPlaying || planController.totalSteps <= 0) return
		isPlaying = true
		intervalId = setInterval(() => {
			if (planController.currentStep >= lastStepIdx) {
				pause()
				return
			}
			void planController.stepPlan('next').then((r) => {
				if (!r.ok) {
					pause()
					reportError(r.error)
				}
			})
		}, STEP_INTERVAL_MS)
	}

	const togglePlay = async () => {
		if (isPlaying) {
			pause()
			return
		}
		// Restart from beginning if at end
		if (atEnd && planController.totalSteps > 0) {
			const result = await planController.setStep(0)
			if (!result.ok) {
				reportError(result.error)
				return
			}
		}
		play()
	}

	const seek = async (index: number) => {
		pause()
		const clamped = Math.max(0, Math.min(lastStepIdx, index))
		if (scrubberEl) scrubberEl.value = String(clamped)
		const result = await planController.setStep(clamped)
		if (!result.ok) reportError(result.error)
	}

	const stepOnce = async (direction: 'prev' | 'next') => {
		pause()
		const result = await planController.stepPlan(direction)
		if (!result.ok) reportError(result.error)
	}

	const jumpTo = async (index: number) => {
		pause()
		const result = await planController.setStep(index)
		if (!result.ok) reportError(result.error)
	}

	$effect(() => {
		if (planController.totalSteps <= 0 && isPlaying) pause()
	})

	$effect(() => {
		return () => pause()
	})
</script>

{#if planController.totalSteps > 0}
	<div
		class="pointer-events-auto fixed bottom-4 left-1/2 z-[10000] flex w-[min(640px,calc(100vw-2rem))] -translate-x-1/2 items-center gap-3 rounded bg-zinc-900/85 px-3 py-2 text-xs text-white"
	>
		<button
			type="button"
			class="flex h-7 w-7 items-center justify-center rounded border border-zinc-600 text-sm leading-none disabled:opacity-40"
			onclick={togglePlay}
			disabled={planController.totalSteps <= 0}
			aria-label={isPlaying ? 'Pause' : 'Play'}
			title={isPlaying ? 'Pause' : 'Play'}
		>
			{isPlaying ? '⏸' : '▶'}
		</button>

		<button
			type="button"
			class="flex h-7 w-7 items-center justify-center rounded border border-zinc-600 text-sm leading-none disabled:opacity-40"
			onclick={() => void jumpTo(0)}
			disabled={planController.steppingPlan || planController.currentStep <= 0}
			aria-label="Jump to start"
			title="Jump to start"
		>
			«
		</button>

		<button
			type="button"
			class="flex h-7 w-7 items-center justify-center rounded border border-zinc-600 text-sm leading-none disabled:opacity-40"
			onclick={() => void stepOnce('prev')}
			disabled={planController.steppingPlan || planController.currentStep <= 0}
			aria-label="Previous step"
			title="Previous step"
		>
			‹
		</button>

		<input
			bind:this={scrubberEl}
			class="scrubber grow"
			type="range"
			min="0"
			max={lastStepIdx}
			value={displayStep}
			oninput={(event) => void seek(Number((event.currentTarget as HTMLInputElement).value))}
		/>

		<button
			type="button"
			class="flex h-7 w-7 items-center justify-center rounded border border-zinc-600 text-sm leading-none disabled:opacity-40"
			onclick={() => void stepOnce('next')}
			disabled={planController.steppingPlan || atEnd}
			aria-label="Next step"
			title="Next step"
		>
			›
		</button>

		<button
			type="button"
			class="flex h-7 w-7 items-center justify-center rounded border border-zinc-600 text-sm leading-none disabled:opacity-40"
			onclick={() => void jumpTo(lastStepIdx)}
			disabled={planController.steppingPlan || atEnd}
			aria-label="Jump to end"
			title="Jump to end"
		>
			»
		</button>

		<span class="tabular-nums whitespace-nowrap">
			{displayStep + 1} / {planController.totalSteps}
		</span>
	</div>
{/if}

<style>
	.scrubber {
		appearance: none;
		-webkit-appearance: none;
		height: 4px;
		border-radius: 2px;
		background: #52525b;
		cursor: pointer;
		accent-color: #ffffff;
	}

	.scrubber::-webkit-slider-thumb {
		-webkit-appearance: none;
		appearance: none;
		width: 14px;
		height: 14px;
		border-radius: 50%;
		background: #ffffff;
		border: none;
		cursor: pointer;
	}

	.scrubber::-moz-range-thumb {
		width: 14px;
		height: 14px;
		border-radius: 50%;
		background: #ffffff;
		border: none;
		cursor: pointer;
	}
</style>
