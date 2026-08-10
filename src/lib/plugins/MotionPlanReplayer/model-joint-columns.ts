/**
 * Which slot of a trajectory step drives each joint of one model.
 *
 * The array order of `model.joints` is *not* the answer on its own. `NewModelWithMimics` seeds a
 * model's input schema by walking `bfsFrameNames` over the model's internal frame system, skipping
 * any frame that has a mimic mapping. A mimic joint therefore has real degrees of freedom and no
 * column, and every joint the walk reaches after it sits one slot earlier than its position suggests.
 *
 * This reproduces the mimic half of that rule and not the order half: it numbers the declared array
 * rather than walking the tree. The two agree for a serial chain declared root to tip, which is what
 * every model in RDK's own test data and in all four captures here happens to be, and disagree for a
 * branching one, where `bfsFrameNames` sorts each node's children alphabetically. A two-finger
 * gripper is exactly that shape, so the gap is not hypothetical. #918 replaces this with the walk.
 */

/** Only the fields that decide a column. The rest of `JointConfig` is read where the frame is built. */
interface MimicJson {
	joint?: string
	multiplier?: number
	offset?: number
}

export interface JointJson {
	id: string
	mimic?: MimicJson
}

export interface JointColumn {
	/** Index into this model's slice of a trajectory step. */
	index: number
	/**
	 * Present iff the joint mimics another one, in which case `index` addresses its *source* and the
	 * value is `multiplier * step[index] + offset` — RDK derives it the same way wherever it resolves
	 * a mimic, in `SimpleModel.Transform` and again in `Geometries`.
	 */
	mimic?: { multiplier: number; offset: number }
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
 * model's name. A joint missing from the result has no value to render — see below for the two shapes
 * that produce that, both of which RDK refuses to build at all.
 */
export const modelJointColumns = (joints: readonly JointJson[]): Map<string, JointColumn> => {
	const mimics = new Map<string, MimicJson>()
	for (const joint of joints) {
		if (joint.mimic) mimics.set(joint.id, joint.mimic)
	}

	const columns = new Map<string, JointColumn>()
	let index = 0
	for (const joint of joints) {
		if (!mimics.has(joint.id)) columns.set(joint.id, { index: index++ })
	}

	for (const id of mimics.keys()) {
		const resolved = resolveMimic(id, mimics)
		const source = resolved && columns.get(resolved.source)

		// A cycle, or a source that is absent or has no DoF. RDK errors out of `buildMimicMappings`
		// rather than build such a model, so this only happens on hand-written config — and dropping
		// the joint leaves it undrawn, which reads better than driving it off an unrelated column.
		if (!resolved || !source) continue

		columns.set(id, {
			index: source.index,
			mimic: { multiplier: resolved.multiplier, offset: resolved.offset },
		})
	}

	return columns
}
