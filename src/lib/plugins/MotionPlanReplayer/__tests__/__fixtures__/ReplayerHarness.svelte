<script lang="ts">
	/**
	 * `provideMotionPlanReplayer` reads the world and the relationship registry off Svelte context, and
	 * `setContext` only works during component init — so the provider cannot be reached from a plain
	 * `$effect.root`. This is the smallest component that stands the three of them up together.
	 *
	 * The world goes back to the spec alongside the context. Everything the replayer actually *does*
	 * lands in the world rather than on the context, so without it a spec can only assert step counts
	 * and indices, and half this module is unobservable.
	 */

	import type { World } from 'koota'

	import { untrack } from 'svelte'

	import { provideWorld, useWorld } from '$lib/ecs'
	import { provideRelationships } from '$lib/hooks/useRelationships.svelte'

	import type { MotionPlanReplayerContext } from '../../useMotionPlanReplayer.svelte'

	import { provideMotionPlanReplayer } from '../../useMotionPlanReplayer.svelte'

	interface Props {
		/** Handed the live context and the world it draws into, once, during init. */
		onReady: (ctx: MotionPlanReplayerContext, world: World) => void
	}

	const { onReady }: Props = $props()

	provideWorld()
	provideRelationships()
	// `untrack` to say the once-at-init read of `onReady` is deliberate. Without it the compiler
	// warns that the reference captures only the prop's initial value, which is exactly the intent:
	// the context and the world are both stable, so there is nothing later to report.
	untrack(() => onReady(provideMotionPlanReplayer(), useWorld()))
</script>
