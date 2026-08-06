<script lang="ts">
	import type { HTMLAttributes } from 'svelte/elements'

	import {
		ChevronLeft,
		ChevronRight,
		ChevronsLeft,
		ChevronsRight,
		Pause,
		Play,
	} from 'lucide-svelte'

	import type { TrajectoryPlayer } from '$lib/motion/trajectoryPlayer.svelte'

	interface Props extends HTMLAttributes<HTMLDivElement> {
		/** Playback state to drive. See `createTrajectoryPlayer`. */
		player: TrajectoryPlayer
		/** Distinguishes this scrubber's controls when more than one is on screen. */
		label?: string
		/**
		 * Frames that are real data rather than drawn between it — planned waypoints, for a preview
		 * that fills in frames between them. Marked on the track so the two are never confused.
		 * Omit when every frame is a waypoint; the marks would be noise.
		 */
		markers?: number[]
	}

	const { player, label = 'trajectory', markers, ...rest }: Props = $props()

	// The player outlives this component — the replayer builds one at its plugin root, the move panel
	// one per preview — so nothing else stops the timer when the controls go away. Leaving it running
	// keeps reconciling the world every frame with no way on screen to pause it.
	$effect(() => {
		const running = player
		return () => running.pause()
	})

	const atStart = $derived(player.currentStep <= 0)

	// Marks only earn their space when they say something the track does not already.
	const tickPercents = $derived.by(() => {
		if (!markers || player.lastStep <= 0 || markers.length >= player.totalSteps) return []
		return markers.map((frame) => (100 * frame) / player.lastStep)
	})

	const currentWaypoint = $derived.by(() => {
		// Same guard as the ticks, and for the same reason: when every frame is a waypoint the counter
		// reads "4 / 12 · waypoint 4 / 12", saying one thing twice.
		if (!markers?.length || markers.length >= player.totalSteps) return undefined
		let passed = 0
		for (const frame of markers) {
			if (frame > player.currentStep) break
			passed += 1
		}
		return { index: passed, total: markers.length }
	})
</script>

{#if player.totalSteps > 0}
	<div
		class="border-light flex flex-col gap-2 border-t pt-2"
		{...rest}
	>
		<div class="relative">
			<input
				class="scrubber w-full"
				type="range"
				min="0"
				max={player.lastStep}
				value={player.currentStep}
				aria-label="{label} step"
				oninput={(e) => player.seek(Number((e.currentTarget as HTMLInputElement).value))}
			/>

			{#if tickPercents.length > 0}
				<!-- Purely informational, and the range input underneath owns the interaction. -->
				<div
					class="pointer-events-none absolute inset-x-0 top-0 h-1"
					aria-hidden="true"
				>
					{#each tickPercents as percent, index (index)}
						<span
							class="bg-gray-8 absolute top-0 h-1 w-px"
							style="left: {percent}%"
						></span>
					{/each}
				</div>
			{/if}
		</div>

		<div class="flex items-center gap-1">
			<button
				type="button"
				class="border-light text-subtle-1 hover:bg-light focus-visible:ring-info-medium flex h-6 w-6 shrink-0 items-center justify-center rounded border focus-visible:ring-2 focus-visible:outline-none disabled:opacity-40"
				onclick={() => player.seek(0)}
				disabled={atStart}
				aria-label="Jump to start of {label}"
				title="Jump to start"
				><ChevronsLeft
					size={12}
					aria-hidden="true"
				/></button
			>

			<button
				type="button"
				class="border-light text-subtle-1 hover:bg-light focus-visible:ring-info-medium flex h-6 w-6 shrink-0 items-center justify-center rounded border focus-visible:ring-2 focus-visible:outline-none disabled:opacity-40"
				onclick={() => player.stepBy(-1)}
				disabled={atStart}
				aria-label="Previous {label} step"
				title="Previous step"
				><ChevronLeft
					size={12}
					aria-hidden="true"
				/></button
			>

			<button
				type="button"
				class="border-light text-subtle-1 hover:bg-light focus-visible:ring-info-medium flex h-6 w-6 shrink-0 items-center justify-center rounded border focus-visible:ring-2 focus-visible:outline-none"
				onclick={() => player.toggle()}
				aria-label={player.isPlaying ? `Pause ${label}` : `Play ${label}`}
				title={player.isPlaying ? 'Pause' : 'Play'}
				>{#if player.isPlaying}<Pause
						size={12}
						aria-hidden="true"
					/>{:else}<Play
						size={12}
						aria-hidden="true"
					/>{/if}</button
			>

			<button
				type="button"
				class="border-light text-subtle-1 hover:bg-light focus-visible:ring-info-medium flex h-6 w-6 shrink-0 items-center justify-center rounded border focus-visible:ring-2 focus-visible:outline-none disabled:opacity-40"
				onclick={() => player.stepBy(1)}
				disabled={player.atEnd}
				aria-label="Next {label} step"
				title="Next step"
				><ChevronRight
					size={12}
					aria-hidden="true"
				/></button
			>

			<button
				type="button"
				class="border-light text-subtle-1 hover:bg-light focus-visible:ring-info-medium flex h-6 w-6 shrink-0 items-center justify-center rounded border focus-visible:ring-2 focus-visible:outline-none disabled:opacity-40"
				onclick={() => player.seek(player.lastStep)}
				disabled={player.atEnd}
				aria-label="Jump to end of {label}"
				title="Jump to end"
				><ChevronsRight
					size={12}
					aria-hidden="true"
				/></button
			>

			<span class="text-subtle-1 font-roboto-mono ml-auto whitespace-nowrap tabular-nums">
				{player.currentStep + 1} / {player.totalSteps}
				{#if currentWaypoint}
					<span class="text-subtle-2">
						· waypoint {currentWaypoint.index} / {currentWaypoint.total}
					</span>
				{/if}
			</span>
		</div>
	</div>
{/if}

<style>
	/*
	 * A range input's track and thumb can only be reached through vendor pseudo-elements, which no
	 * utility class targets — hence the block. The values are the same theme tokens the utilities
	 * would resolve to.
	 */
	.scrubber {
		appearance: none;
		-webkit-appearance: none;
		height: 4px;
		border-radius: 2px;
		background: var(--color-gray-4);
		cursor: pointer;
	}
	.scrubber::-webkit-slider-thumb {
		-webkit-appearance: none;
		appearance: none;
		width: 12px;
		height: 12px;
		border-radius: 50%;
		background: var(--color-gray-8);
		border: none;
		cursor: pointer;
	}
	.scrubber::-moz-range-thumb {
		width: 12px;
		height: 12px;
		border-radius: 50%;
		background: var(--color-gray-8);
		border: none;
		cursor: pointer;
	}
</style>
