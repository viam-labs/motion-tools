<script lang="ts">
	import type { Snippet } from 'svelte'

	import { untrack } from 'svelte'

	import MotionPlanReplayerScrubber from './MotionPlanReplayerScrubber.svelte'
	import MotionPlanReplayerUI from './MotionPlanReplayerUI.svelte'
	import { type PlanEntry, provideMotionPlanReplayer } from './useMotionPlanReplayer.svelte'

	interface Props {
		/** Pass plans to seed the list on mount (e.g. from app DB fetch). */
		plans?: PlanEntry[]
		/**
		 * Rendered inside the plan panel's action area. Components here can call
		 * `useMotionPlanReplayer()` to reach `addPlan` and the rest of the context,
		 * so a custom source (DB picker, fetch button) stays app-side.
		 */
		children?: Snippet
	}

	const { plans, children }: Props = $props()

	provideMotionPlanReplayer(untrack(() => plans))
</script>

<MotionPlanReplayerUI {children} />
<MotionPlanReplayerScrubber />
