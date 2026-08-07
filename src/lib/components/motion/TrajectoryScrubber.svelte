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
		 *
		 * Must be ascending, free of duplicates, and within `[0, player.lastStep]`. Nothing here
		 * enforces that: the counter counts by walking until it passes `currentStep`, so an unsorted
		 * array stops early and reads a plausible wrong number, a duplicate inflates both halves, and
		 * an out-of-range entry places a tick outside the track. `PreviewFrames.waypoints` from
		 * `$lib/motion/interpolateTrajectory` is built to satisfy all three and is the intended source.
		 */
		markers?: number[]
	}

	const { player, label = 'trajectory', markers, ...rest }: Props = $props()

	/**
	 * The thumb's diameter, shared with the `--thumb-size` the style block reads, because the tick
	 * positions below have to correct for it and two copies of the number would drift.
	 */
	const THUMB_PX = 12

	// The player outlives this component — the replayer builds one at its plugin root, the move panel
	// one per preview — so nothing else stops the timer when the controls go away. Leaving it running
	// keeps reconciling the world every frame with no way on screen to pause it.
	$effect(() => {
		const running = player
		return () => running.pause()
	})

	const atStart = $derived(player.currentStep <= 0)

	const BUTTON_CLASS =
		'border-light text-subtle-1 focus-visible:ring-info-medium flex h-6 w-6 shrink-0 items-center justify-center rounded border focus-visible:ring-2 focus-visible:outline-none'
	const ENABLED_CLASS = 'hover:bg-light active:bg-medium'
	const DISABLED_CLASS = 'opacity-40'

	/**
	 * Where each mark sits along the track, as a fraction of the way from the first frame to the
	 * last. The pixel geometry is the `.tick` rule's problem, not this one's.
	 *
	 * Marks only earn their space when they say something the track does not already. The density
	 * rule also subsumes the divide-by-zero: `lastStep` is 0 only when there is at most one step, and
	 * that admits no marker the rule would let through.
	 */
	const tickFractions = $derived.by(() => {
		if (!markers || markers.length >= player.totalSteps) return []
		return markers.map((frame) => frame / player.lastStep)
	})

	const currentWaypoint = $derived.by(() => {
		// Same density rule as the ticks, and for the same reason: when every frame is a waypoint the
		// counter reads "4 / 12 · waypoint 4 / 12", saying one thing twice.
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
		<div
			class="relative"
			style="--thumb-size: {THUMB_PX}px"
		>
			<input
				class="scrubber w-full"
				type="range"
				min="0"
				max={player.lastStep}
				value={player.currentStep}
				aria-label="{label} step"
				oninput={(e) => {
					const input = e.currentTarget
					player.seek(Number(input.value))
					// A refused seek leaves `currentStep` where it was, and Svelte writes `value` back only
					// when the bound expression changes, so nothing would put the thumb back: it would sit
					// at the refused index while the counter and the scene both still read the old one.
					input.value = String(player.currentStep)
				}}
			/>

			{#if tickFractions.length > 0}
				<!-- Purely informational, and the range input underneath owns the interaction. -->
				<div
					class="pointer-events-none absolute inset-x-0 top-0 h-1"
					aria-hidden="true"
				>
					{#each tickFractions as fraction, index (index)}
						<span
							class="tick bg-gray-8 absolute top-0 h-1 w-px"
							style="--tick-fraction: {fraction}"
							data-testid="waypoint-tick"
						></span>
					{/each}
				</div>
			{/if}
		</div>

		<div class="flex items-center gap-1">
			<!--
				`aria-disabled` rather than `disabled` so the ends of a trajectory do not drop the control
				out of the tab order under a keyboard user mid-scrub, matching the upload button in this
				same panel. It leaves the click live, so each handler re-checks; `stepBy` would clamp to a
				no-op anyway, but `seek` would re-render the step it is already on.
			-->
			<button
				type="button"
				class={[BUTTON_CLASS, atStart ? DISABLED_CLASS : ENABLED_CLASS]}
				onclick={() => !atStart && player.seek(0)}
				aria-disabled={atStart}
				aria-label="Jump to start of {label}"
				title="Jump to start"
				><ChevronsLeft
					size={12}
					aria-hidden="true"
				/></button
			>

			<button
				type="button"
				class={[BUTTON_CLASS, atStart ? DISABLED_CLASS : ENABLED_CLASS]}
				onclick={() => !atStart && player.stepBy(-1)}
				aria-disabled={atStart}
				aria-label="Previous {label} step"
				title="Previous step"
				><ChevronLeft
					size={12}
					aria-hidden="true"
				/></button
			>

			<button
				type="button"
				class={[BUTTON_CLASS, ENABLED_CLASS]}
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
				class={[BUTTON_CLASS, player.atEnd ? DISABLED_CLASS : ENABLED_CLASS]}
				onclick={() => !player.atEnd && player.stepBy(1)}
				aria-disabled={player.atEnd}
				aria-label="Next {label} step"
				title="Next step"
				><ChevronRight
					size={12}
					aria-hidden="true"
				/></button
			>

			<button
				type="button"
				class={[BUTTON_CLASS, player.atEnd ? DISABLED_CLASS : ENABLED_CLASS]}
				onclick={() => !player.atEnd && player.seek(player.lastStep)}
				aria-disabled={player.atEnd}
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
	 * would resolve to. `--thumb-size` is set by the markup from `THUMB_PX`, which the tick offsets
	 * are computed from; the diameter has to be one number or the marks drift off the thumb.
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
		width: var(--thumb-size);
		height: var(--thumb-size);
		border-radius: 50%;
		background: var(--color-gray-8);
		border: none;
		cursor: pointer;
	}
	.scrubber::-moz-range-thumb {
		width: var(--thumb-size);
		height: var(--thumb-size);
		border-radius: 50%;
		background: var(--color-gray-8);
		border: none;
		cursor: pointer;
	}

	/*
	 * The thumb's centre travels from half a thumb in to half a thumb short of the end, not the full
	 * width, so a mark placed at a bare percentage misses the frame it marks by up to half a thumb:
	 * 6px left at the first frame, 6px right at the last, correct only at the midpoint. The ends are
	 * exactly where someone checks whether the thumb is sitting on a mark.
	 */
	.tick {
		left: calc(var(--tick-fraction) * (100% - var(--thumb-size)) + var(--thumb-size) / 2);
	}
</style>
