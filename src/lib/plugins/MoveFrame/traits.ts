import { trait } from 'koota'

/**
 * The component a preview ghost stands in for, by name.
 *
 * The trait counterpart to `GhostOf` in `./relations`, and here for the same reason: a ghost
 * deliberately carries no `Name` and no `ChildOf`, which leaves it with no way to answer "which arm
 * does this belong to" — and that is exactly what the collision check needs in order to group a
 * ghost with the thing it mirrors. A staged-move ghost answers it by pointing at its source entity;
 * a preview ghost has no source entity to point at, because it is a *moment* of a component rather
 * than a copy of one, so it carries the subject's name instead.
 *
 * A ghost is the same physical object as its subject at a different moment, so the two must never be
 * reported as touching. The collision check partitions the scene by owner and filters each group
 * against itself, so a name is all it takes: an arm's ghost lands in that arm's group and stops
 * testing against the arm's real links, while a ghosted obstacle lands in the environment alongside
 * the real one and is filtered the same way.
 *
 * Lives apart from `previewGhosts` so the collision layer depends on the label and not on the whole
 * spawn-and-scrub lifecycle it happens to be declared next to.
 */
export const PreviewOf = trait(() => '')

const ORIGIN_SUFFIX = '_origin'

/**
 * The component that owns a synthesized frame, which is what {@link PreviewOf} carries. Inverts the
 * naming `frameSystemToPlanFrames` builds: `arm`, `arm_origin` and `arm:wrist_1_link` all belong to
 * `arm`.
 *
 * Here rather than beside the spawner for the same reason the trait is: this is how a value for it
 * is derived, so anything that reads the label can produce one without reaching for the lifecycle.
 */
export const previewComponentName = (frameName: string): string => {
	const part = frameName.split(':')[0] ?? frameName
	return part.endsWith(ORIGIN_SUFFIX) ? part.slice(0, -ORIGIN_SUFFIX.length) : part
}
