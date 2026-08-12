/**
 * Reconstructs the frames rdk derives from a component's kinematics, so the
 * scene can be composed from one `frameSystemConfig` fetch instead of polling
 * `getGeometries` for collision meshes that never change.
 *
 * Mirrors `referenceframe.createFramesFromPart` plus the flattened model
 * internals. For a component that supplies kinematics, rdk contributes:
 *
 * ```
 * <name>_origin   static, positioned by the component's config `frame`
 * ├── <name>      the model frame — its pose is the resolved chain, i.e. the
 * │               end effector, which is what other components mount to
 * └── <name>:<id> the model's own links and joints, namespaced, hanging off
 *                 `_origin` as a parallel branch
 * ```
 *
 * Naming this way is what makes children fall out for free: a camera configured
 * with `parent: arm-1` keeps that reference verbatim and lands on the end
 * effector, because `<name>` means the same thing here as it does in rdk.
 */

import type { Transform } from '@viamrobotics/sdk'

import {
	isDHModel,
	parseKinematicsGeometry,
	type RawKinematicsLink,
	type RawKinematicsModel,
} from '$lib/kinematicsTransform'
import { Pose } from '$lib/math'
import { poseFromJson } from '$lib/math/spatialJson'

/** rdk's suffix for the static frame a part's config `frame` positions. */
export const ORIGIN_SUFFIX = '_origin'

export const originFrameName = (componentName: string): string => `${componentName}${ORIGIN_SUFFIX}`

/** Inverse of {@link originFrameName}; `undefined` when the name isn't suffixed. */
export const componentOfOriginFrame = (frameName: string): string | undefined =>
	frameName.endsWith(ORIGIN_SUFFIX) ? frameName.slice(0, -ORIGIN_SUFFIX.length) : undefined

/** rdk namespaces a model's internal frames with the owning component. */
export const internalFrameName = (componentName: string, id: string): string =>
	`${componentName}:${id}`

/**
 * The component a namespaced internal frame belongs to, or `undefined` for a
 * frame that isn't one. Component names cannot contain a colon, so the first one
 * is the separator.
 */
export const ownerOfInternalFrame = (frameName: string): string | undefined => {
	const colon = frameName.indexOf(':')
	return colon === -1 ? undefined : frameName.slice(0, colon)
}

interface KinematicNode {
	id: string
	parent?: string
	isLink: boolean
}

/** Derived frames carry no server-assigned identity; only world-state transforms do. */
const NO_UUID = new Uint8Array(0)

const transform = (
	name: string,
	parentName: string,
	pose: Pose,
	physicalObject?: Transform['physicalObject']
): Transform => ({
	uuid: NO_UUID,
	referenceFrame: name,
	poseInObserverFrame: { referenceFrame: parentName, pose },
	physicalObject,
})

/**
 * The nearest ancestor that is a link.
 *
 * Only links become frames here — a joint has no geometry, and its pose is
 * redundant once each link is resolved against its nearest link ancestor. At
 * zero configuration a joint contributes no offset, so skipping it leaves the
 * baseline pose intact; the live pose comes from `getPose` against this same
 * parent, which keeps the composition exact either way.
 *
 * `seen` guards a malformed model whose parent chain loops back on itself.
 */
const nearestLinkAncestor = (
	link: RawKinematicsLink,
	nodes: Record<string, KinematicNode>
): KinematicNode | undefined => {
	let parent = link.parent === undefined ? undefined : nodes[link.parent]
	const seen = new Set<string>()

	while (parent && !parent.isLink) {
		if (seen.has(parent.id)) {
			return undefined
		}
		seen.add(parent.id)
		parent = parent.parent === undefined ? undefined : nodes[parent.parent]
	}

	return parent
}

/**
 * Build the derived frames for one component.
 *
 * A `"DH"` model yields no links at all, so it produces only the component
 * frame — polled directly, with no geometry to draw. Saying so is the difference
 * between a component that is visibly bare and one that is silently missing.
 */
export const deriveKinematicsFrames = (
	componentName: string,
	model: RawKinematicsModel
): Transform[] => {
	const originName = originFrameName(componentName)
	const frames: Transform[] = []

	if (isDHModel(model)) {
		console.warn(
			`[kinematics] "${componentName}" is a DH-parameter model; its geometries cannot be derived from the frame system`
		)
		return [transform(componentName, originName, new Pose())]
	}

	const links = model.links ?? []
	// Scoped per component: two arms of the same model share link ids.
	const nodes: Record<string, KinematicNode> = {}
	for (const link of links) {
		nodes[link.id] = { id: link.id, parent: link.parent, isLink: true }
	}
	for (const joint of model.joints ?? []) {
		nodes[joint.id] = { id: joint.id, parent: joint.parent, isLink: false }
	}

	for (const link of links) {
		const frameName = internalFrameName(componentName, link.id)
		const linkPose = { translation: link.translation, orientation: link.orientation }
		const pose = poseFromJson(link.translation, link.orientation)

		const parent = nearestLinkAncestor(link, nodes)
		const parentFrameName = parent ? internalFrameName(componentName, parent.id) : originName

		frames.push(
			transform(
				frameName,
				parentFrameName,
				pose,
				// The link's own pose is what turns the geometry's parent-relative
				// offset into a link-local one.
				link.geometry ? parseKinematicsGeometry(link.geometry, linkPose) : undefined
			)
		)
	}

	// The model frame, parented to `_origin` exactly as rdk parents it. Its pose
	// is the whole resolved chain, so `getPose` supplies it — hanging it off the
	// model's output link instead would put it at the same place without a query,
	// but only by asking for a pose *relative to* a flattened internal frame, and
	// `FrameSystem.Frame` returns nil for those names outside the referenceframe
	// package. `_origin` is a frame the API will answer for.
	frames.push(transform(componentName, originName, new Pose()))

	return frames
}
