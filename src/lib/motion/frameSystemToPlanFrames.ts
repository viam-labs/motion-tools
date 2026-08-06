/**
 * Rebuilds the flattened frame system RDK's motion service would build, from what the robot will
 * actually hand a browser.
 *
 * The `plan` DoCommand answers with a trajectory and nothing else — joint values, no poses — so
 * anything that wants to *draw* a plan has to supply the kinematics itself. The plan replayer gets
 * them from RDK's debug dump (`FrameSystem.MarshalJSON()`), which no RPC exposes. What is exposed
 * is `robot.frameSystemConfig`: one `FrameSystemConfig` per part, carrying that part's offset from
 * its parent plus, in `kinematics`, the very same model config the dump nests at
 * `frames['left-arm'].frame.model` — `FrameSystemPart.ToProtobuf` fills it from
 * `ModelFrame.MarshalJSON()`.
 *
 * The gap between the two is the flattening RDK does when it *builds* the frame system, which is
 * what this file reproduces. For a part `p`:
 *
 * | frame            | holds                                    | parent                          |
 * | ---------------- | ---------------------------------------- | ------------------------------- |
 * | `p_origin`       | p's offset from its parent (+ geometry)  | whatever p is parented to       |
 * | `p`              | the model, or an identity placeholder    | `p_origin`                      |
 * | `p:<link.id>`    | the link's `LinkConfig`                  | `p:<link.parent>`, else p_origin |
 * | `p:<joint.id>`   | the joint's `JointConfig`                | `p:<joint.parent>`, else p_origin |
 *
 * Verified against `__fixtures__/plan.json`, a dual-arm rig whose dump contains exactly this shape.
 * The one asymmetry worth naming: a part *without* a model carries its geometry on `p_origin` and
 * leaves `p` an empty frame, which is what RDK does and why `p` is emitted at all — descendants are
 * parented to the bare name, so the frame has to exist for them to hang off.
 */

import type { Struct } from '@bufbuild/protobuf'
import type { commonApi, robotApi } from '@viamrobotics/sdk'

import { Geometry } from '$lib/buf/common/v1/common_pb'
import { Pose } from '$lib/math'

import type { DecodedFrame, FrameSystemJson, RawFrame } from './frameDescriptors'

import { DECODED_FRAME_TYPE } from './frameDescriptors'

/** RDK's `referenceframe.World`, the root every chain terminates at. */
const WORLD = 'world'

/** The suffix RDK gives a part's mount offset when it splits it off the part's own frame. */
const originName = (part: string): string => `${part}_origin`

/**
 * The fields of RDK's `ModelConfigJSON` this file reads. Everything else it carries — `name`,
 * `original_file`, `dhParams` — is either unused or unsupported by the descriptor builder.
 */
interface ModelConfig {
	links?: ModelNode[]
	joints?: Array<ModelNode & { type?: string }>
	kinematic_param_type?: string
}

/**
 * Go types both of these as strings, but a model config is JSON that has been through a
 * `google.protobuf.Struct` and, before that, whatever converted it from URDF — where joints are
 * routinely named for their index. A numeric `0` is a name, so it is read as one; only a missing or
 * empty name means "unnamed".
 */
interface ModelNode {
	id?: string
	parent?: string
}

/**
 * Narrowed from `string | number`, which nothing could produce. `LinkConfig.ID` and
 * `JointConfig.ID` are Go `string`s, so `StructToStructPb` can only emit a StringValue, and a
 * numeric id fails `json.Unmarshal` before a model is ever built. The URDF converter reads
 * `jointElem.Name`, not an index, so that route cannot produce one either.
 */
const nodeName = (value: string | undefined): string | undefined =>
	value === undefined || value === '' ? undefined : value

/**
 * `kinematics` arrives as a `google.protobuf.Struct`, whose fields are boxed `Value` messages —
 * `toJson` is what turns it back into the plain `ModelConfigJSON` that RDK marshalled.
 *
 * It is present but empty for a part with no model, since RDK writes a zero `ModelConfigJSON`
 * rather than omitting the field, so emptiness is decided by content rather than presence.
 */
const modelConfigOf = (
	kinematics: Struct | undefined,
	partName: string
): ModelConfig | undefined => {
	if (!kinematics) return undefined

	const model = kinematics.toJson() as ModelConfig | null
	if (!model || typeof model !== 'object') return undefined

	// Checked before the links/joints test below rather than after it, which is where this used
	// to sit and why it could never print: a DH config carries `dhParams` and no `links` or
	// `joints`, so it was already being discarded as model-less one line earlier. DH expands into
	// a joint/link pair per parameter, which reading it as SVA would render as an armless chain.
	if (model.kinematic_param_type === 'DH') {
		console.warn(`[motion] "${partName}" uses DH kinematics, which are not supported — not drawn`)
		return undefined
	}

	const hasContent = (model.links?.length ?? 0) > 0 || (model.joints?.length ?? 0) > 0
	return hasContent ? model : undefined
}

/**
 * RDK registers `revolute`, `prismatic`, `continuous` and `fixed`; `JointConfig.ToFrame` builds a
 * frame for the first two and errors on the others. Mapping only what it maps keeps an unsupported
 * joint out of the chain rather than silently drawing it as a hinge — the last two take the same
 * warn-and-skip path.
 */
const jointFrameType = (type: string | undefined): 'rotational' | 'translational' | undefined => {
	if (type === 'revolute') return 'rotational'
	if (type === 'prismatic') return 'translational'
	return undefined
}

const decodedFrame = (pose: Pose, geometry: DecodedFrame['geometry']): RawFrame => ({
	frame_type: DECODED_FRAME_TYPE,
	frame: { pose, geometry } satisfies DecodedFrame,
})

/**
 * The SDK and this package generate `common.v1.Geometry` separately, and the two classes are not
 * assignable to each other — the mesh bytes differ by `ArrayBufferLike` vs `ArrayBuffer` alone.
 * Bytes are already how this repo bridges independently generated protos (see
 * `transformBytesToSnapshots`), and a re-decode per preview is not worth a cast that would outlive
 * whichever generator moves first.
 */
const toLocalGeometry = (geometry: commonApi.Geometry | undefined): Geometry | null =>
	geometry ? Geometry.fromBinary(geometry.toBinary()) : null

/**
 * A model's own links and joints name their parents inside the model's namespace, and the root one
 * names `world` — meaning the model's own mount, not the scene root.
 */
const modelInternalParent = (part: string, parent: string | undefined): string => {
	const name = nodeName(parent)
	return name === undefined || name === WORLD ? originName(part) : `${part}:${name}`
}

export const frameSystemToPlanFrames = (parts: robotApi.FrameSystemConfig[]): FrameSystemJson => {
	const frames: Record<string, RawFrame> = {}
	const parents: Record<string, string> = {}

	for (const part of parts) {
		const transform = part.frame
		const name = transform?.referenceFrame
		// The world root is not a part and has no offset of its own to place.
		if (!transform || !name || name === WORLD) continue

		const origin = originName(name)
		// Not a documented default: RDK hard-errors with `ErrEmptyStringFrameName` on an empty frame
		// name, encoding and decoding alike, so a reply carrying one never came from a healthy server.
		// Rooting it at the world keeps the rest of the scene drawable instead of dropping the part.
		parents[origin] = transform.poseInObserverFrame?.referenceFrame || WORLD

		const model = modelConfigOf(part.kinematics, name)
		const geometry = toLocalGeometry(transform.physicalObject)

		// Unconditional, because RDK builds `p_origin` from the part's frame config and nothing else
		// (`frame_system.go:1105`) — whether the part has a model has no bearing on it. Skipping it for
		// modelled parts cost an arm with a configured safety envelope that entire collision volume,
		// silently, in a view whose whole job is to show what a move would hit.
		frames[origin] = decodedFrame(new Pose().copy(transform.poseInObserverFrame?.pose), geometry)

		parents[name] = origin

		if (!model) {
			// Present but empty: descendants parent to the bare name, and `buildFrameContexts` needs
			// the entry to resolve their context.
			frames[name] = decodedFrame(new Pose(), null)
			continue
		}

		// A model with no joints and a configured geometry is not published as a model at all: RDK
		// replaces the model frame with a bare static one (`frame_system.go:1112-1128`), and a static
		// frame is not flattenable (`:406`), so the part emits no `p:<link>` frames. The user's shape
		// was meant to *replace* the model's, and drawing the links anyway shows collision volumes RDK
		// discarded, doubled up with the one that replaced them.
		//
		// The stand-in sits at identity where RDK puts it at the model's zero-input transform. For a
		// jointless chain those differ by the model's internal offset, which reaching for here would
		// mean a second forward-kinematics implementation; anything parented to the bare part name is
		// off by that much, and nothing else is.
		if ((model.joints ?? []).length === 0 && geometry) {
			frames[name] = decodedFrame(new Pose(), null)
			continue
		}

		// The model frame itself draws nothing; it exists so `buildFrameContexts` can read the joint
		// order out of it and remap anything parented to the bare part name onto the end effector.
		frames[name] = { frame_type: 'model', frame: { name, model } }

		for (const link of model.links ?? []) {
			const linkId = nodeName(link.id)
			if (linkId === undefined) continue
			const frameName = `${name}:${linkId}`
			frames[frameName] = {
				frame_type: 'named',
				frame: { name: frameName, inner_frame: { frame_type: 'static', frame: link } },
			}
			parents[frameName] = modelInternalParent(name, link.parent)
		}

		for (const joint of model.joints ?? []) {
			const jointId = nodeName(joint.id)
			if (jointId === undefined) continue
			const innerType = jointFrameType(joint.type)
			if (!innerType) {
				console.warn(
					`[motion] unsupported joint type "${String(joint.type)}" on "${name}:${jointId}" — not drawn`
				)
				continue
			}
			const frameName = `${name}:${jointId}`
			frames[frameName] = {
				frame_type: 'named',
				frame: { name: frameName, inner_frame: { frame_type: innerType, frame: joint } },
			}
			parents[frameName] = modelInternalParent(name, joint.parent)
		}
	}

	return { frames, parents }
}
