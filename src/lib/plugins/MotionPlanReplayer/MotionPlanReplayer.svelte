<script lang="ts">
	import type { Snippet } from 'svelte'

	import { untrack } from 'svelte'

	import MotionPlanReplayerUI from './MotionPlanReplayerUI.svelte'
	import {
		type MotionPlanReplayerContext,
		type PlanEntry,
		provideMotionPlanReplayer,
	} from './useMotionPlanReplayer.svelte'

	interface Props {
		/** Pass plans to seed the list on mount (e.g. from app DB fetch). */
		plans?: PlanEntry[]
		/**
		 * Rendered inside the plan panel's action area, and passed the replayer
		 * context as its snippet argument. Use that argument, not
		 * `useMotionPlanReplayer()`: the panel is portaled out of this component's
		 * subtree, so host children resolve context at their own call site, not here.
		 */
		children?: Snippet<[MotionPlanReplayerContext]>
	}

	const { plans, children }: Props = $props()

	provideMotionPlanReplayer(untrack(() => plans))
</script>

<MotionPlanReplayerUI {children} />
