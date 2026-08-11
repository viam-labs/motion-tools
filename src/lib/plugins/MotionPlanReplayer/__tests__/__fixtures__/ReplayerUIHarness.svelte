<script lang="ts">
	/**
	 * Stands up the world, the relationship registry and the replayer context, then renders the
	 * panel itself. `provideMotionPlanReplayer` publishes to a module-level singleton rather than
	 * Svelte context (see its own comment), so it only has to run before `MotionPlanReplayerUI`
	 * mounts, not be its ancestor.
	 */

	import { untrack } from 'svelte'

	import { provideWorld } from '$lib/ecs'
	import { provideRelationships } from '$lib/hooks/useRelationships.svelte'

	import MotionPlanReplayerUI from '../../MotionPlanReplayerUI.svelte'
	import { type PlanEntry, provideMotionPlanReplayer } from '../../useMotionPlanReplayer.svelte'

	interface Props {
		plans?: PlanEntry[]
	}

	const { plans }: Props = $props()

	provideWorld()
	provideRelationships()
	// `untrack`, matching `MotionPlanReplayer.svelte`: only the initial value of `plans` is ever
	// read, seeding the store once at mount.
	provideMotionPlanReplayer(untrack(() => plans))
</script>

<MotionPlanReplayerUI />
