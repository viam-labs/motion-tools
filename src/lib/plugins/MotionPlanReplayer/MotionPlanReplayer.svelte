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
		/** Seed the list on mount (e.g. app DB fetch). */
		plans?: PlanEntry[]
		/**
		 * Plan-panel action slot. Use the snippet's `replayer` arg, not
		 * `useMotionPlanReplayer()` — the panel is portaled out of this subtree.
		 */
		children?: Snippet<[MotionPlanReplayerContext]>
	}

	const { plans, children }: Props = $props()

	provideMotionPlanReplayer(untrack(() => plans))
</script>

<MotionPlanReplayerUI {children} />
