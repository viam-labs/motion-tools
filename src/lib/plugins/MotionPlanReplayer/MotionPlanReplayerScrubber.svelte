<script lang="ts">
	import { useMotionPlanReplayer } from './useMotionPlanReplayer.svelte'

	const STEP_INTERVAL_MS = 100

	const ctx = useMotionPlanReplayer()

	let isPlaying = $state(false)
	let intervalId: ReturnType<typeof setInterval> | undefined

	const lastStepIdx = $derived(Math.max(0, ctx.totalSteps - 1))
	const atEnd = $derived(ctx.currentStep >= lastStepIdx)

	const pause = () => {
		isPlaying = false
		if (intervalId !== undefined) {
			clearInterval(intervalId)
			intervalId = undefined
		}
	}

	const play = () => {
		if (isPlaying || ctx.totalSteps <= 0) return
		isPlaying = true
		intervalId = setInterval(() => {
			if (ctx.currentStep >= lastStepIdx) {
				pause()
				return
			}
			ctx.setStep(ctx.currentStep + 1)
		}, STEP_INTERVAL_MS)
	}

	const togglePlay = () => {
		if (isPlaying) {
			pause()
			return
		}
		if (atEnd && ctx.totalSteps > 0) ctx.setStep(0)
		play()
	}

	const seek = (index: number) => {
		pause()
		ctx.setStep(index)
	}

	const stepOnce = (direction: 'prev' | 'next') => {
		pause()
		ctx.setStep(direction === 'next' ? ctx.currentStep + 1 : ctx.currentStep - 1)
	}

	$effect(() => {
		if (ctx.totalSteps <= 0 && isPlaying) pause()
	})
	$effect(() => () => pause())
</script>

{#if ctx.totalSteps > 0}
	<div
		class="pointer-events-auto fixed bottom-4 left-1/2 z-[10000] flex w-[min(640px,calc(100vw-2rem))] -translate-x-1/2 items-center gap-3 rounded bg-zinc-900/85 px-3 py-2 text-xs text-white"
	>
		<!-- Exit replay -->
		<button
			type="button"
			class="flex h-7 w-7 shrink-0 items-center justify-center rounded border border-zinc-600 text-sm leading-none"
			onclick={ctx.clearActivePlan}
			aria-label="Exit replay"
			title="Exit replay"
		>×</button>

		<button
			type="button"
			class="flex h-7 w-7 shrink-0 items-center justify-center rounded border border-zinc-600 text-sm leading-none disabled:opacity-40"
			onclick={togglePlay}
			disabled={ctx.totalSteps <= 0}
			aria-label={isPlaying ? 'Pause' : 'Play'}
			title={isPlaying ? 'Pause' : 'Play'}
		>{isPlaying ? '⏸' : '▶'}</button>

		<button
			type="button"
			class="flex h-7 w-7 shrink-0 items-center justify-center rounded border border-zinc-600 text-sm leading-none disabled:opacity-40"
			onclick={() => seek(0)}
			disabled={ctx.currentStep <= 0}
			aria-label="Jump to start"
			title="Jump to start"
		>«</button>

		<button
			type="button"
			class="flex h-7 w-7 shrink-0 items-center justify-center rounded border border-zinc-600 text-sm leading-none disabled:opacity-40"
			onclick={() => stepOnce('prev')}
			disabled={ctx.currentStep <= 0}
			aria-label="Previous step"
			title="Previous step"
		>‹</button>

		<input
			class="scrubber grow"
			type="range"
			min="0"
			max={lastStepIdx}
			value={ctx.currentStep}
			oninput={(e) => seek(Number((e.currentTarget as HTMLInputElement).value))}
		/>

		<button
			type="button"
			class="flex h-7 w-7 shrink-0 items-center justify-center rounded border border-zinc-600 text-sm leading-none disabled:opacity-40"
			onclick={() => stepOnce('next')}
			disabled={atEnd}
			aria-label="Next step"
			title="Next step"
		>›</button>

		<button
			type="button"
			class="flex h-7 w-7 shrink-0 items-center justify-center rounded border border-zinc-600 text-sm leading-none disabled:opacity-40"
			onclick={() => seek(lastStepIdx)}
			disabled={atEnd}
			aria-label="Jump to end"
			title="Jump to end"
		>»</button>

		<span class="tabular-nums whitespace-nowrap">{ctx.currentStep + 1} / {ctx.totalSteps}</span>
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
