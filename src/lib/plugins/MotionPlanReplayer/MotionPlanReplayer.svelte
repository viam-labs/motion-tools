<script lang="ts">
	import { untrack } from 'svelte'

	import MotionPlanReplayerScrubber from './MotionPlanReplayerScrubber.svelte'
	import MotionPlanReplayerUI from './MotionPlanReplayerUI.svelte'
	import { type PlanEntry, provideMotionPlanReplayer } from './useMotionPlanReplayer.svelte'

	interface Props {
		plans?: PlanEntry[]
	}

	const { plans }: Props = $props()

	const appEmbedded = $derived(plans !== undefined)

	// `plans` is intentionally read once at setup time — initial entries only.
	// The context manages its own reactive plan list after that.
	provideMotionPlanReplayer(untrack(() => plans))
</script>

<MotionPlanReplayerUI {appEmbedded} />
<MotionPlanReplayerScrubber />
