<script lang="ts">
	/**
	 * A real player behind the scrubber, mounted the way the replayer mounts one: built above the
	 * `{#if}` that renders the controls, so it outlives them. A stub player cannot stand in here,
	 * because what needs asserting is that the timer stops, not that `pause` was called.
	 */

	import { untrack } from 'svelte'

	import type { TrajectoryPlayer } from '$lib/motion/trajectoryPlayer.svelte'

	import { createTrajectoryPlayer } from '$lib/motion/trajectoryPlayer.svelte'

	import TrajectoryScrubber from '../../TrajectoryScrubber.svelte'

	interface Props {
		totalSteps: number
		intervalMs: number
		/** Flip to false to take the controls off screen, as closing the panel does. */
		showing: boolean
		/** Handed the player and the log of every index it reported, once at init. */
		onReady: (player: TrajectoryPlayer, steps: number[]) => void
	}

	const { totalSteps, intervalMs, showing, onReady }: Props = $props()

	const steps: number[] = []

	const player = createTrajectoryPlayer({
		totalSteps: () => totalSteps,
		intervalMs: () => intervalMs,
		onStep: (step) => {
			steps.push(step)
		},
	})

	// Once, at init: both the player and the log are stable, so re-reporting them would say nothing.
	untrack(() => onReady(player, steps))
</script>

{#if showing}
	<TrajectoryScrubber {player} />
{/if}
