<script lang="ts">
	import { untrack } from 'svelte'

	import MotionPlanReplayerScrubber from './MotionPlanReplayerScrubber.svelte'
	import MotionPlanReplayerUI from './MotionPlanReplayerUI.svelte'
	import { type PlanEntry, provideMotionPlanReplayer } from './useMotionPlanReplayer.svelte'

	interface Props {
		/** Pass plans to use app-embedded mode (props-driven, no drag-and-drop UI). Omit for standalone mode. */
		plans?: PlanEntry[]
	}

	const { plans }: Props = $props()

	// `plans` is intentionally read once at setup time — initial entries only.
	// The context manages its own reactive plan list after that.
	provideMotionPlanReplayer(untrack(() => plans))
</script>

{#if plans === undefined}
	<MotionPlanReplayerUI />
{/if}
<MotionPlanReplayerScrubber />
