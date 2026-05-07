<script lang="ts">
	import type { Entity } from 'koota'
	import type { Snippet } from 'svelte'

	import { traits, useParentName, useTrait } from '$lib/ecs'
	import { usePose } from '$lib/hooks/usePose.svelte'
	import { newMatrixTrait, poseToMatrixTrait } from '$lib/transform'

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

	const tempMatrix = newMatrixTrait()

	// Mirror the robot's live kinematics-resolved pose into LiveMatrix so
	// Frame.svelte can compose the rendered transform via
	// `composeRenderedMatrix(live, baseline, edited)`.
	$effect.pre(() => {
		if (pose.current === undefined) return

		const matrixFields = poseToMatrixTrait(pose.current, tempMatrix)
		if (entity.has(traits.LiveMatrix)) {
			entity.set(traits.LiveMatrix, matrixFields)
		} else {
			entity.add(traits.LiveMatrix(matrixFields))
		}
	})
</script>

{@render children()}
