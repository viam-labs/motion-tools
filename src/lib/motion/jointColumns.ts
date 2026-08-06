/**
 * Which slot of a trajectory step drives each joint of one model.
 *
 * RDK answers this in a single loop, `referenceframe/model.go:238-247`:
 *
 * ```go
 * // Build zero inputs in BFS order, skipping mimic frames.
 * for _, fn := range bfsFrameNames(fs) {
 *     if mimics[fn] != nil {
 *         continue
 *     }
 * ```
 *
 * Two independent facts live in those four lines, and reading either one alone misnumbers a real
 * machine:
 *
 * - **The order is the model's internal frame system, not its config.** `bfsFrameNames`
 *   (`frame_system.go:1279-1306`) walks breadth-first from `world`, sorting each node's children
 *   alphabetically (`:1290`). Declaration order agrees only when links and joints are declared down
 *   the chain, which an xArm6 and every fixture here happen to be.
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
 * Both fields are Go `string`s, and every route here preserves that: `StructToStructPb` can only
 * emit a StringValue for one, and a numeric id fails `json.Unmarshal` before a model is ever built.
 * The URDF converter reads `jointElem.Name` rather than an index, so it cannot produce one either.
 * Only a missing or empty name is real, and it means "unnamed".
 */
export interface ModelNodeJson {
	id?: string
	parent?: string
}

export interface JointJson extends ModelNodeJson {
	mimic?: MimicJson
}

/** The two members of a model config that decide the chain. */
export interface ModelJson {
	links?: ModelNodeJson[]
	joints?: JointJson[]
}

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
	const links = model?.links ?? []
	const joints = model?.joints ?? []

	const mimics = new Map<string, MimicJson>()
	const jointIds: string[] = []
	for (const joint of joints) {
		const id = nodeName(joint.id)
		if (id === undefined) continue
		jointIds.push(id)
		if (joint.mimic) mimics.set(id, joint.mimic)
	}
	const isJoint = new Set(jointIds)

	const childrenOf = new Map<string, string[]>()
	for (const node of [...links, ...joints]) {
		const id = nodeName(node.id)
		if (id === undefined) continue
		const parent = nodeName(node.parent) ?? MODEL_ROOT
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

	// A joint the walk never reached means the chain does not resolve the way RDK's would, so its
	// column is a guess. Declaration order is the better guess than dropping it, which would take
	// the joint's whole subtree out of the drawing with it.
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
