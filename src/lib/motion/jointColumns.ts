/**
 * Which slot of a trajectory step drives each joint of one model.
 *
 * RDK answers this in one loop, in `NewModelWithMimics`: it walks `bfsFrameNames(fs)`, skips any
 * frame that has a mimic mapping, and gives each survivor a slot as wide as its degrees of freedom.
 * Links survive the walk too and contribute nothing, because a static frame has no DoF.
 *
 * Two independent facts live in that loop, and reading either one alone misnumbers a real machine:
 *
 * - **The order is the model's internal frame system, not its config.** `bfsFrameNames` walks
 *   breadth-first from `world`, sorting each node's children with `sort.Strings`. Declaration order
 *   agrees only when links and joints are declared down the chain, which an xArm6 and every fixture
 *   here happen to be.
 * - **A mimic joint has degrees of freedom and no column.** Its value is derived from its source's,
 *   so every joint the walk reaches after it sits one slot earlier than its position suggests.
 *   Common in URDF grippers, where both fingers are driven from one.
 *
 * Getting either wrong drives a joint from an unrelated joint's value and folds the arm through
 * itself, and `jointValueAt`'s `?? 0` silences the overflow at the end of the chain.
 */

/** The root of a model's *internal* frame system — its own mount, not the scene root. */
const MODEL_ROOT = 'world'

/** Only the fields that decide a column. The rest of `JointConfig` is read where the frame is built. */
interface MimicJson {
	joint?: string
	multiplier?: number
	offset?: number
}

/**
 * Both fields are Go `string`s on `LinkConfig` and `JointConfig`, so the only absent value that can
 * reach here is a missing key or the empty string, never a number. Both mean "unnamed".
 */
export interface ModelNodeJson {
	id?: string
	parent?: string
}

export interface JointJson extends ModelNodeJson {
	mimic?: MimicJson
}

/** The members of a model config that decide the chain. */
export interface ModelJson {
	links?: ModelNodeJson[]
	joints?: JointJson[]
	/**
	 * Not read by anything in this file — `modelJointColumns` only looks at `links` and `joints`.
	 * `modelOutputFrame` in `frameDescriptors.ts` is the actual reader, and now receives this same
	 * type rather than an untyped record. Declared here anyway so a model with more than one leaf
	 * can be written down: RDK refuses to build one without it, so a fixture that omits it is a
	 * shape no machine can send.
	 */
	output_frames?: string[]
}

/**
 * An unnamed node cannot be addressed, so it is dropped from the tree rather than joined into it:
 * left in, every one of them would collide on the same empty key and claim each other's children.
 * Exported because `soleLeafOf` in `frameDescriptors.ts` reads the same `model.links`/`model.joints`
 * and needs the identical rule — left unapplied there, an unnamed node reads as an extra childless
 * frame instead of no frame at all.
 */
export const nodeName = (value: string | undefined): string | undefined =>
	value === undefined || value === '' ? undefined : value

export interface JointColumn {
	/** Index into this model's slice of a trajectory step. */
	index: number
	/**
	 * Present iff the joint mimics another, in which case `index` addresses its *source* and the value
	 * to use is `multiplier * step[index] + offset`, as RDK derives it.
	 */
	mimic?: { multiplier: number; offset: number }
}

export interface ModelJointColumns {
	/**
	 * Every joint the model declares, in schema order. Mimics are included: they own a frame even
	 * though they own no column, and the last entry is what a model without a declared end effector
	 * hangs its tool off.
	 */
	order: string[]
	/** Keyed by joint id. A joint missing from this has no value to render — see below for why. */
	columns: Map<string, JointColumn>
}

/** RDK reads a zero multiplier as "unset" and substitutes 1 (`MimicConfig.EffectiveMultiplier`). */
const multiplierOf = (mimic: MimicJson): number => mimic.multiplier || 1

/**
 * Follows `a mimics b mimics c` down to the joint that owns a column, composing the linear maps as it
 * goes: `a = m₁(m₂c + o₂) + o₁`. Returns nothing for a cycle, which has no such joint at the bottom.
 */
const resolveMimic = (
	jointId: string,
	mimics: Map<string, MimicJson>
): { source: string; multiplier: number; offset: number } | undefined => {
	const own = mimics.get(jointId)!
	const visited = new Set([jointId])

	let multiplier = multiplierOf(own)
	let offset = own.offset ?? 0
	let source = own.joint ?? ''

	for (let next = mimics.get(source); next !== undefined; next = mimics.get(source)) {
		if (visited.has(source)) return undefined
		visited.add(source)

		offset += multiplier * (next.offset ?? 0)
		multiplier *= multiplierOf(next)
		source = next.joint ?? ''
	}

	return { source, multiplier, offset }
}

/**
 * Keyed by joint id, not frame name: the `${model}:${id}` join belongs to the caller that knows the
 * model's name. `modelName` is read only to name the model in the one warning below.
 */
export const modelJointColumns = (
	model: ModelJson | undefined,
	modelName: string
): ModelJointColumns => {
	// `Array.isArray` rather than `??`: the nullish default only catches an absent list, and a
	// hand-edited or malformed capture can declare `links`/`joints` as `{}` rather than `[]`. `??`
	// passes that straight through to the spread below, which throws a bare `TypeError` and takes the
	// whole plan render down. `soleLeafOf` in `frameDescriptors.ts` guards the identical hazard.
	const rawLinks = model?.links
	const rawJoints = model?.joints
	const links = Array.isArray(rawLinks) ? rawLinks : []
	const joints = Array.isArray(rawJoints) ? rawJoints : []

	const mimics = new Map<string, MimicJson>()
	const jointIds: string[] = []
	for (const joint of joints) {
		const id = nodeName(joint.id)
		if (id === undefined) continue
		jointIds.push(id)
		if (joint.mimic) mimics.set(id, joint.mimic)
	}
	const isJoint = new Set(jointIds)

	const nodes = [...links, ...joints]
	const declared = new Set(nodes.map((node) => nodeName(node.id)).filter((id) => id !== undefined))

	const childrenOf = new Map<string, string[]>()
	for (const node of nodes) {
		const id = nodeName(node.id)
		if (id === undefined) continue

		// RDK roots a node whose parent is not itself a declared node, rather than only one that names
		// no parent at all: `buildModelFrameSystem` seeds its queue with every child whose parent is
		// absent from `transforms`, then attaches it to `fs.World()`. So a link parented to a name that
		// does not exist is an ordinary world-rooted frame to RDK, with a real position in the walk,
		// not a disconnected one.
		const named = nodeName(node.parent)
		const parent = named !== undefined && declared.has(named) ? named : MODEL_ROOT

		const siblings = childrenOf.get(parent)
		if (siblings) siblings.push(id)
		else childrenOf.set(parent, [id])
	}
	for (const siblings of childrenOf.values()) siblings.sort()

	const order: string[] = []
	const seen = new Set<string>()
	const queue = [MODEL_ROOT]
	while (queue.length > 0) {
		const current = queue.shift()!
		if (seen.has(current)) continue
		seen.add(current)
		if (isJoint.has(current)) order.push(current)
		queue.push(...(childrenOf.get(current) ?? []))
	}

	// Now that an undeclared parent roots at the model instead of stranding its child, the only way
	// to miss a joint is a parent cycle, which RDK refuses to build at all (`ErrCircularReference`).
	// So this is defensive rather than a path real data takes, and it stays because the alternative
	// is silent: dropping the joint would take its whole subtree out of the drawing with it, where
	// appending it in declaration order costs one warning and keeps the arm on screen.
	const unreached = jointIds.filter((id) => !seen.has(id))
	if (unreached.length > 0) {
		console.warn(
			`[motion] joints ${unreached.join(', ')} on "${modelName}" are not connected to its base — their trajectory columns are a guess`
		)
		order.push(...unreached)
	}

	const columns = new Map<string, JointColumn>()
	let index = 0
	for (const id of order) {
		if (!mimics.has(id)) columns.set(id, { index: index++ })
	}

	for (const id of mimics.keys()) {
		const resolved = resolveMimic(id, mimics)
		const source = resolved && columns.get(resolved.source)

		// A cycle, or a source that is absent or has no column. RDK refuses to build such a model, so
		// this needs hand-written config; leaving the joint undrawn beats driving it off an unrelated
		// column.
		if (!resolved || !source) continue

		columns.set(id, {
			index: source.index,
			mimic: { multiplier: resolved.multiplier, offset: resolved.offset },
		})
	}

	return { order, columns }
}
