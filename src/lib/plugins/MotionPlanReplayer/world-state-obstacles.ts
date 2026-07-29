/**
 * Obstacles that exist only in `world_state`, which RDK writes as proto-JSON for
 * `common.v1.WorldState` — a different encoding from the Go-struct marshal `parseGeometry` decodes by
 * hand for `frame_system` frames. protobuf-es reads that encoding natively, so this is a translation
 * to `Transform` rather than a second hand-written geometry parser.
 */

import type { JsonValue } from '@bufbuild/protobuf'

import { UuidTool } from 'uuid-tool'

import { PoseInFrame, Transform, WorldState } from '$lib/buf/common/v1/common_pb'
import { Pose } from '$lib/math'

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

	// `WorldState.transforms` may also carry geometry — the proto uses it to attach moving obstacles
	// to the frame system. No capture exercises it, so it is reported rather than guessed at.
	if (parsed.transforms.length > 0) {
		console.warn(
			`[MotionPlanReplayer] ignoring ${parsed.transforms.length} world_state transform(s) — geometry attached this way is not drawn`
		)
	}

	return parsed.obstacles.flatMap((group, groupIndex) =>
		group.geometries.map(
			(geometry, index) =>
				new Transform({
					// Obstacle labels collide with frame names — `pallet` and `pick-station` are both in
					// the pirouette capture — and `resolveOrphans` indexes names globally, so an
					// unprefixed obstacle would cross-parent into the arm chain.
					referenceFrame: `obstacle/${geometry.label || `${groupIndex}-${index}`}`,
					poseInObserverFrame: new PoseInFrame({
						referenceFrame: group.referenceFrame,
						// Identity: a world_state geometry carries its pose in its own `center`, which is
						// already local to the reference frame — `parseGeometry`'s obstacle convention.
						pose: new Pose(),
					}),
					physicalObject: geometry,
					uuid: Uint8Array.from(UuidTool.toBytes(crypto.randomUUID())),
				})
		)
	)
}
