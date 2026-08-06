import type { Entity, World } from 'koota'

import { hierarchy, traits } from '$lib/ecs'

import type { CollisionMember } from './collisionWorld'

import { GhostOf } from '../relations'
import { PreviewOf } from '../traits'
import { ENVIRONMENT_BIT } from './interactionGroups'

/** Cycle guard for the parent walk, mirroring `recomputeWorldMatrix`. */
const MAX_DEPTH = 64

/**
 * Viam's collider primitives. Meshes and point clouds are excluded — Rapier's
 * trimesh-vs-trimesh case produces no contacts, so including them would look
 * supported while reporting nothing.
 */
const COLLIDABLE = [traits.Box, traits.Capsule, traits.Sphere] as const

/**
 * The group bit of the arm that owns `entity`, or `ENVIRONMENT_BIT` when
 * nothing above it is an arm.
 *
 * An arm's colliders are its kinematics link frames, so the walk climbs the link
 * chain before reaching the frame named after the component. It continues past
 * that too, because a gripper is its own component: its colliders hang off the
 * gripper frame, which is mounted on the arm. Stopping at the direct parent
 * would put the gripper in the environment and report it hitting the flange it
 * is bolted to.
 */
export const armBitFor = (entity: Entity, armBits: ReadonlyMap<string, number>): number => {
	let current: Entity | undefined = entity

	for (let depth = 0; current !== undefined && depth < MAX_DEPTH; depth += 1) {
		if (!current.isAlive()) break

		const name = current.get(traits.Name)
		if (name !== undefined) {
			const bit = armBits.get(name)
			if (bit !== undefined) return bit
		}

		current = hierarchy.getParentEntity(current)
	}

	return ENVIRONMENT_BIT
}

/**
 * Whether the entity stands in for something rather than being it.
 *
 * Two kinds do: a staged-move ghost, which points at the entity it copies, and a preview ghost,
 * which names the component it is a future moment of. Both are claims about where something *would*
 * be, which is the distinction the panel draws between "would collide" and "currently touching".
 */
export const isGhost = (entity: Entity): boolean =>
	entity.targetFor(GhostOf) !== undefined || entity.has(PreviewOf)

/**
 * Every collidable entity in the scene, paired with the group bit that decides
 * what it tests against.
 *
 * Invisible entities are left out — hiding geometry is a statement that it
 * shouldn't be considered. `ColliderHidden` entities stay in: that flag only
 * means a CAD model is drawn in place of the collider, which is still there.
 *
 * A ghost takes its source's bit, so a previewed gripper keeps testing against
 * the environment and keeps ignoring the arm it hangs off.
 */
export const collectMembers = (
	world: World,
	armBits: ReadonlyMap<string, number>
): CollisionMember[] => {
	const members: CollisionMember[] = []
	const seen = new Set<Entity>()
	const bitCache = new Map<Entity, number>()

	// Built in full up front rather than lazily: a ghost can be visited before its subject, and the
	// query order is not something to depend on.
	const liveByName = new Map<string, Entity>()
	for (const entity of world.query(traits.Name)) {
		const name = entity.get(traits.Name)
		if (name !== undefined && !liveByName.has(name)) liveByName.set(name, entity)
	}

	const bitFor = (entity: Entity): number => {
		const cached = bitCache.get(entity)
		if (cached !== undefined) return cached

		// A preview ghost names its subject outright — it has no `Name` and no parent for the walk
		// below to follow. `PreviewOf` carries a *component* name while `armBits` holds arm resource
		// names, so an arm answers on the first line and a gripper or camera does not: those are their
		// own components, mounted on an arm, and only the parent walk knows it. Indexing `armBits`
		// alone dropped them into the environment — where they tested against, and touched, the live
		// twin they sit exactly on top of.
		//
		// Falling through to the environment is the honest answer when the name resolves to nothing
		// live, or to something with no arm above it: neither says which arm owns the ghost.
		const previewed = entity.get(PreviewOf)
		if (previewed !== undefined) {
			const subject = liveByName.get(previewed)
			const bit =
				armBits.get(previewed) ??
				(subject?.isAlive() ? armBitFor(subject, armBits) : ENVIRONMENT_BIT)
			bitCache.set(entity, bit)
			return bit
		}

		// One hop only — a ghost's source is never itself a ghost, and resolving
		// through a chain would need a cycle guard for no gain.
		const source = entity.targetFor(GhostOf)
		const subject = source?.isAlive() ? source : entity

		const bit = armBitFor(subject, armBits)
		bitCache.set(entity, bit)
		return bit
	}

	for (const trait of COLLIDABLE) {
		for (const entity of world.query(trait, traits.WorldMatrix)) {
			if (seen.has(entity) || entity.has(traits.InheritedInvisible)) continue
			seen.add(entity)
			members.push({ entity, bit: bitFor(entity) })
		}
	}

	return members
}
