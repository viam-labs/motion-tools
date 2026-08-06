<script lang="ts">
	/**
	 * `provideMotionPlanReplayer` reads the world and the relationship registry off Svelte context, and
	 * `setContext` only works during component init — so the provider cannot be reached from a plain
	 * `$effect.root`. This is the smallest component that stands the three of them up together.
	 */

	import { untrack } from 'svelte'

	import { provideWorld } from '$lib/ecs'
	import { provideRelationships } from '$lib/hooks/useRelationships.svelte'

	import type { MotionPlanReplayerContext } from '../../useMotionPlanReplayer.svelte'

	import { provideMotionPlanReplayer } from '../../useMotionPlanReplayer.svelte'

	interface Props {
		/** Handed the live context so the spec can drive it without reaching through the DOM. */
		onReady: (ctx: MotionPlanReplayerContext) => void
	}

	const { onReady }: Props = $props()

	provideWorld()
	provideRelationships()
	// Once, at init: the context is a stable object, so re-reporting it would say nothing new.
	untrack(() => onReady(provideMotionPlanReplayer()))
</script>
