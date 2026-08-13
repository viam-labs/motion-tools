/**
 * Numbers the declared `joints` array rather than walking `bfsFrameNames` as RDK does, so a mimic is
 * skipped correctly but a branching model's columns come out in a different order. #918 fixes that.
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
	 * Present iff the joint mimics another, in which case `index` addresses its *source* and the value
	 * to use is `multiplier * step[index] + offset`, as RDK derives it.
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
 * Which slot of a trajectory step drives each joint, keyed by joint id: the `${model}:${id}` join
 * belongs to the caller that knows the model's name. A joint absent from the result has none to
 * render.
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

		// A cycle, or a source that is absent or has no column. RDK refuses to build such a model, so
		// this needs hand-written config; leaving the joint undrawn beats driving it off an unrelated
		// column.
		if (!resolved || !source) continue

		columns.set(id, {
			index: source.index,
			mimic: { multiplier: resolved.multiplier, offset: resolved.offset },
		})
	}

	return columns
}
