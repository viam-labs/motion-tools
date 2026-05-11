<script lang="ts">
	import type { Entity } from 'koota'
	import type { Snippet } from 'svelte'

	import { Matrix4 } from 'three'

	import { traits, useParentName, useTrait } from '$lib/ecs'
	import { usePose } from '$lib/hooks/usePose.svelte'
	import { poseToMatrix } from '$lib/transform'

	interface Props {
		entity: Entity
		children: Snippet
	}
	let { entity, children }: Props = $props()

	const name = useTrait(() => entity, traits.Name)
	const parent = useParentName(() => entity)

	const pose = usePose(
		() => name.current,
		() => parent.current
	)

	// Mirror the robot's live kinematics-resolved pose into LiveMatrix so
	// Frame.svelte can compose the rendered transform via
	// `composeRenderedMatrix(live, baseline, edited)`. Mutate the stored
	// `Matrix4` in place when present and notify via `entity.changed` —
	// allocate only on first add.
	$effect.pre(() => {
		if (pose.current === undefined) return

		const live = entity.get(traits.LiveMatrix)
		if (live) {
			poseToMatrix(pose.current, live)
			entity.changed(traits.LiveMatrix)
		} else {
			entity.add(traits.LiveMatrix(poseToMatrix(pose.current, new Matrix4())))
		}
	})
</script>

{@render children()}
