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
 * The part is everything before the **last** colon, not the first, because a colon is RDK's remote
 * delimiter as well as its link delimiter — and it is only ever a delimiter, since `:` is a reserved
 * character in a resource name (`resource/resource.go:40`). A remote arm is therefore `myremote:arm`
 * with links `myremote:arm:wrist_1_link`, and nesting can go deeper still. Splitting on the first
 * colon answered `myremote`, which is neither an `armBits` key nor any live frame's name, so every
 * ghost of a remote arm fell through to the environment and reported touching the arm it sits
 * exactly on top of — the whole bug this trait exists to prevent, reinstated for remote parts.
 *
 * Stripping `_origin` first is what makes the last-colon rule exact rather than a guess. `_origin` is
 * appended to the whole part name (`frame_system.go:1105`), so a name ending in it settles the
 * question outright; every other frame reaching here is `<part>:<link>`, because the bare part frame
 * carries no geometry and so is never ghosted. Without that ordering `myremote:arm_origin` would
 * read as part `myremote`.
 *
 * Here rather than beside the spawner for the same reason the trait is: this is how a value for it
 * is derived, so anything that reads the label can produce one without reaching for the lifecycle.
 */
export const previewComponentName = (frameName: string): string => {
	if (frameName.endsWith(ORIGIN_SUFFIX)) return frameName.slice(0, -ORIGIN_SUFFIX.length)

	const lastColon = frameName.lastIndexOf(':')
	return lastColon === -1 ? frameName : frameName.slice(0, lastColon)
}
