/**
 * Rapier collision-group filtering for the collision check.
 *
 * Rapier packs an `InteractionGroups` into one u32: the upper 16 bits are the
 * groups a collider *belongs to*, the lower 16 the groups it *tests against*.
 * Two colliders are considered only when each one's membership intersects the
 * other's filter. That test runs in the broad phase, so an excluded pair costs
 * nothing — it never reaches narrow phase at all.
 *
 * The scene is partitioned so an arm never tests against itself. An arm's link
 * colliders overlap at every joint by design, and reporting those would bury
 * real hits under permanent noise. Each arm takes its own bit and filters
 * itself out; everything unowned shares the environment bit.
 *
 * The consequence is deliberate: one arm folding into itself is never reported.
 * Self-collision is the motion service's job — it plans against the arm's own
 * kinematics server-side. What this view uniquely shows is the arm hitting
 * something the world state didn't know about.
 *
 * Two arms in one cell still test against each other, holding different bits.
 */

/** Colliders with no owning arm: static obstacles, world-state geometry, dropped files. */
export const ENVIRONMENT_BIT = 0

/** Rapier gives 16 membership bits; bit 0 is the environment, so 15 arms fit. */
const MAX_BIT = 15

const ALL_BITS = 0xff_ff

/**
 * Pack membership and filter halves into Rapier's `InteractionGroups` u32.
 *
 * `>>> 0` keeps the result unsigned — JS bitwise operators return a signed
 * int32, and a membership in bit 15 would otherwise arrive negative.
 */
export const interactionGroups = (memberships: number, filter: number): number =>
	(((memberships & ALL_BITS) << 16) | (filter & ALL_BITS)) >>> 0

/**
 * Assign each arm its own group bit, in the order given, starting at 1.
 *
 * Arms past the 15th share the last bit and stop testing against each other. A
 * cell that large isn't worth the complexity, and the degradation is quiet
 * under-reporting rather than a false alarm.
 */
export const assignArmBits = (armNames: readonly string[]): Map<string, number> => {
	const bits = new Map<string, number>()
	let next = ENVIRONMENT_BIT + 1
	for (const name of armNames) {
		if (bits.has(name)) continue
		bits.set(name, next)
		if (next < MAX_BIT) next += 1
	}
	return bits
}

/**
 * The interaction groups for a collider owned by the arm holding `bit`, or by
 * the environment when `bit` is `ENVIRONMENT_BIT`.
 *
 * An arm belongs to its own bit and tests against every bit but that one, so it
 * sees the environment and other arms, never its own links. The environment
 * belongs to bit 0 and tests against everything including itself — two static
 * obstacles that intersect is a world-state error worth surfacing.
 */
export const groupsForBit = (bit: number): number => {
	const membership = 1 << bit
	if (bit === ENVIRONMENT_BIT) return interactionGroups(membership, ALL_BITS)
	return interactionGroups(membership, ALL_BITS & ~membership)
}
