/**
 * Obstacles that exist only in `world_state`, which RDK writes as proto-JSON for
 * `common.v1.WorldState` — a different encoding from the Go-struct marshal `parseGeometry` decodes by
 * hand for `frame_system` frames. protobuf-es reads that encoding natively, so this is a translation
 * to `Transform` rather than a second hand-written geometry parser.
 *
 * Mirrors `draw/geometries_in_frame.go`'s `ToTransforms`: one transform per geometry, named for its
 * label under a shared prefix, parented to the frame the geometry was observed in, with the geometry
 * itself carried as `physicalObject`. `WorldState.obstacles` and `WorldState.transforms` are the same
 * thing in different shapes — both are geometry positioned in a frame — so both come through here.
 */

import type { JsonValue, PartialMessage } from '@bufbuild/protobuf'

import { UuidTool } from 'uuid-tool'

import {
	type Pose as CommonPose,
	Geometry,
	PoseInFrame,
	Transform,
	WorldState,
} from '$lib/buf/common/v1/common_pb'
import { Pose } from '$lib/math'

const namespaced = (label: string, fallback: string): string => `obstacle:${label || fallback}`

const newUuid = (): Uint8Array<ArrayBuffer> =>
	Uint8Array.from(UuidTool.toBytes(crypto.randomUUID()))

// `PartialMessage` so both `$lib/math`'s Pose and a decoded proto Pose fit — the former is the
// identity default, the latter comes off a supplemental transform.
const obstacleTransform = (
	name: string,
	parent: string,
	pose: PartialMessage<CommonPose>,
	geometry: Geometry
): Transform =>
	new Transform({
		referenceFrame: name,
		poseInObserverFrame: new PoseInFrame({ referenceFrame: parent || 'world', pose }),
		physicalObject: geometry,
		uuid: newUuid(),
	})

export const worldStateObstacleTransforms = (worldState: unknown): Transform[] => {
	if (!worldState || typeof worldState !== 'object') return []

	let parsed: WorldState
	try {
		// Not optional: protobuf-es rejects unknown JSON fields by default, so one field added to the
		// proto would erase every obstacle rather than the one it appears on.
		parsed = WorldState.fromJson(worldState as JsonValue, { ignoreUnknownFields: true })
	} catch (error) {
		console.warn('[MotionPlanReplayer] skipping world_state obstacles:', error)
		return []
	}

	const fromObstacles = parsed.obstacles.flatMap((group, groupIndex) =>
		group.geometries.map((geometry, index) =>
			obstacleTransform(
				namespaced(geometry.label, `${groupIndex}-${index}`),
				group.referenceFrame,
				// Identity: the geometry carries its pose in its own `center`, already local to the
				// reference frame it was observed in.
				new Pose(),
				geometry
			)
		)
	)

	// A supplemental transform already names itself and its parent; only its geometry needs lifting.
	// Ones carrying no geometry are pure frame plumbing with nothing to draw.
	const fromTransforms = parsed.transforms
		.filter((transform) => transform.physicalObject !== undefined)
		.map((transform, index) =>
			obstacleTransform(
				namespaced(transform.referenceFrame, `transform-${index}`),
				transform.poseInObserverFrame?.referenceFrame ?? 'world',
				transform.poseInObserverFrame?.pose ?? new Pose(),
				transform.physicalObject!
			)
		)

	return [...fromObstacles, ...fromTransforms]
}
