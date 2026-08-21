<script lang="ts">
	import type { Snippet } from 'svelte'

	import { untrack } from 'svelte'

	import { useEnvironment } from '$lib/hooks/useEnvironment.svelte'

	import MotionPlanReplayerUI from './MotionPlanReplayerUI.svelte'
	import { type ResolvePlanSnapshots } from './plan-dropper'
	import { type PlanEntry, provideMotionPlanReplayer } from './useMotionPlanReplayer.svelte'

	interface Props {
		/** Seed the list on mount (e.g. app DB fetch). */
		plans?: PlanEntry[]
		children?: Snippet
		/** Host hook to resolve uploaded plans server-side. Unset keeps client parsing. */
		resolvePlanSnapshots?: ResolvePlanSnapshots
	}

	const { plans, children, resolvePlanSnapshots }: Props = $props()

	provideMotionPlanReplayer(untrack(() => plans))

	const environment = useEnvironment()
</script>

{#if environment.current.mode === 'monitor'}
	<MotionPlanReplayerUI
		{children}
		{resolvePlanSnapshots}
	/>
{/if}
