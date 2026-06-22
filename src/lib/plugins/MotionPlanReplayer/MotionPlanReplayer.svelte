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
		 * Optional snippet rendered inside the plan panel's action area.
		 * Receives `addPlan(name, content)` so callers can inject a DB picker
		 * without escaping the plugin's context boundary.
		 */
		extraSource?: Snippet<[(name: string, content: string) => void]>
	}

	const { plans, extraSource }: Props = $props()

	provideMotionPlanReplayer(untrack(() => plans))
</script>

<MotionPlanReplayerUI {extraSource} />
<MotionPlanReplayerScrubber />
