<script lang="ts">
	import {
		ChevronLeft,
		ChevronRight,
		ChevronsLeft,
		ChevronsRight,
		Pause,
		Play,
	} from 'lucide-svelte'

	import type { MotionPlanReplayerContext } from './useMotionPlanReplayer.svelte'

	interface Props {
		/**
		 * Passed in rather than pulled from context: this renders
		 * inside `<FloatingPanel>`, whose body is a `<Portal>` snippet.
		 */
		ctx: MotionPlanReplayerContext
	}

	const { ctx }: Props = $props()

	const STEP_INTERVAL_MS = 100

	let isPlaying = $state(false)

	const lastStepIdx = $derived(Math.max(0, ctx.totalSteps - 1))
	const atEnd = $derived(ctx.currentStep >= lastStepIdx)

	const pause = () => {
		isPlaying = false
	}

	const play = () => {
		if (ctx.totalSteps <= 0) return
		isPlaying = true
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
		if (!isPlaying) return

		const intervalId = setInterval(() => {
			if (ctx.currentStep >= lastStepIdx) {
				pause()
				return
			}
			ctx.setStep(ctx.currentStep + 1)
		}, STEP_INTERVAL_MS)

		return () => clearInterval(intervalId)
	})

	$effect(() => {
		if (ctx.totalSteps <= 0 && isPlaying) pause()
	})
</script>

{#if ctx.totalSteps > 1}
	<div class="border-light flex flex-col gap-2 border-t pt-2">
		<input
			class="scrubber w-full"
			type="range"
			min="0"
			max={lastStepIdx}
			value={ctx.currentStep}
			oninput={(e) => seek(Number((e.currentTarget as HTMLInputElement).value))}
		/>

		<div class="flex items-center gap-1">
			<button
				type="button"
				class="border-light text-subtle-1 hover:bg-light flex h-6 w-6 shrink-0 items-center justify-center rounded border disabled:opacity-40"
				onclick={() => seek(0)}
				disabled={ctx.currentStep <= 0}
				aria-label="Jump to start"
				title="Jump to start"><ChevronsLeft size={12} /></button
			>

			<button
				type="button"
				class="border-light text-subtle-1 hover:bg-light flex h-6 w-6 shrink-0 items-center justify-center rounded border disabled:opacity-40"
				onclick={() => stepOnce('prev')}
				disabled={ctx.currentStep <= 0}
				aria-label="Previous step"
				title="Previous step"><ChevronLeft size={12} /></button
			>

			<button
				type="button"
				class="border-light text-subtle-1 hover:bg-light flex h-6 w-6 shrink-0 items-center justify-center rounded border"
				onclick={togglePlay}
				aria-label={isPlaying ? 'Pause' : 'Play'}
				title={isPlaying ? 'Pause' : 'Play'}
				>{#if isPlaying}<Pause size={12} />{:else}<Play size={12} />{/if}</button
			>

			<button
				type="button"
				class="border-light text-subtle-1 hover:bg-light flex h-6 w-6 shrink-0 items-center justify-center rounded border disabled:opacity-40"
				onclick={() => stepOnce('next')}
				disabled={atEnd}
				aria-label="Next step"
				title="Next step"><ChevronRight size={12} /></button
			>

			<button
				type="button"
				class="border-light text-subtle-1 hover:bg-light flex h-6 w-6 shrink-0 items-center justify-center rounded border disabled:opacity-40"
				onclick={() => seek(lastStepIdx)}
				disabled={atEnd}
				aria-label="Jump to end"
				title="Jump to end"><ChevronsRight size={12} /></button
			>

			<span class="text-subtle-1 font-roboto-mono ml-auto whitespace-nowrap tabular-nums">
				{ctx.currentStep + 1} / {ctx.totalSteps}
			</span>
		</div>
	</div>
{/if}

<style>
	.scrubber {
		appearance: none;
		-webkit-appearance: none;
		height: 4px;
		border-radius: 2px;
		background: var(--color-gray-4, #d7d7d9);
		cursor: pointer;
	}
	.scrubber::-webkit-slider-thumb {
		-webkit-appearance: none;
		appearance: none;
		width: 12px;
		height: 12px;
		border-radius: 50%;
		background: var(--color-gray-8, #333438);
		border: none;
		cursor: pointer;
	}
	.scrubber::-moz-range-thumb {
		width: 12px;
		height: 12px;
		border-radius: 50%;
		background: var(--color-gray-8, #333438);
		border: none;
		cursor: pointer;
	}
</style>
