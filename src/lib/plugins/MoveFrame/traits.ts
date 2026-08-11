import { type Entity, trait } from 'koota'

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

/**
 * The component `entity` is a preview ghost of, or `undefined` when it carries none.
 *
 * `PreviewOf`'s declared zero value is `''`, so `entity.get(PreviewOf)` reads identically whether
 * the entity never carried the trait or carried it uninitialised. Before this helper existed the
 * collision layer tested that three different ways — `has`, `!== undefined`, truthiness — in
 * `isGhost`, the collision bit, and the display name respectively, which agree for every ghost this
 * trait has ever actually been given but would disagree the moment one carried `''`: `isGhost` and
 * the bit lookup would call it a preview, the display name would not. Not reachable today —
 * `previewComponentName` never returns `''` — but normalising here, the same way `nodeName` in
 * `frameSystemToPlanFrames.ts` normalises a missing-or-empty frame id, means the three call sites
 * can't drift apart from each other if that ever changes.
 */
export const previewedComponent = (entity: Entity): string | undefined => {
	const value = entity.get(PreviewOf)
	return value === undefined || value === '' ? undefined : value
}

const ORIGIN_SUFFIX = '_origin'

/**
 * The component that owns a synthesized frame, which is what {@link PreviewOf} carries. Inverts the
 * naming `frameSystemToPlanFrames` builds: `arm`, `arm_origin` and `arm:wrist_1_link` all belong to
 * `arm`.
 *
 * The part is everything before the **last** colon, not the first, because a colon is RDK's remote
 * delimiter as well as its link delimiter — and it is only ever a delimiter, since `:` is a reserved
 * character in a resource name (`resource/resource.go`). A remote arm is therefore `myremote:arm`
 * with links `myremote:arm:wrist_1_link`, and nesting can go deeper still. Splitting on the first
 * colon answered `myremote`, which is neither an `armBits` key nor any live frame's name, so every
 * ghost of a remote arm fell through to the environment and reported touching the arm it sits
 * exactly on top of — the whole bug this trait exists to prevent, reinstated for remote parts.
 *
 * Stripping `_origin` first is what makes the last-colon rule exact rather than a guess. `_origin` is
 * appended to the whole part name (`frame_system.go`), so a name ending in it settles the
 * question outright; every other frame reaching here is `<part>:<link>`, because the bare part frame
 * carries no geometry and so is never ghosted. Without that ordering `myremote:arm_origin` would
 * read as part `myremote`.
 *
 * **Known limitation:** this assumes `_origin` is only ever appended by `frameSystemToPlanFrames`,
 * never a real suffix on a link's own name. Nothing enforces that — a URDF may legally name a link
 * `wrist_origin` — so `arm:wrist_origin` strips `_origin` before the colon split ever runs and
 * returns `arm:wrist`, not `arm`. Colon-first isn't a fix either: `myremote:arm_origin` would then
 * read as part `myremote`. The exact fix is to stop re-deriving the part name here and carry it from
 * `frameSystemToPlanFrames`, which built both names and knows which is which; that spans more than
 * this file and is deferred. Checked all four reference captures for a `<part>:<link>_origin` frame:
 * zero, so this is a latent gap, not a live one. See `traits.spec.ts` for the pinned behaviour.
 *
 * Here rather than beside the spawner for the same reason the trait is: this is how a value for it
 * is derived, so anything that reads the label can produce one without reaching for the lifecycle.
 */
export const previewComponentName = (frameName: string): string => {
	if (frameName.endsWith(ORIGIN_SUFFIX)) return frameName.slice(0, -ORIGIN_SUFFIX.length)

	const lastColon = frameName.lastIndexOf(':')
	return lastColon === -1 ? frameName : frameName.slice(0, lastColon)
}
