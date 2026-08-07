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
 *
 * **This targets RDK v1.x, and Go symbols are named rather than cited by line.** Line numbers drift
 * between releases, and the version in this repo's `go.mod` is not the one to check them against:
 * `v0.122.0` has no `named` frame type at all — `namedFrame` is absent from `register.go` and has no
 * `MarshalJSON`, so dumping a frame system there fails outright with "not a registered Frame
 * implementation". The `named`/`inner_frame` shape reproduced here, and the `plan.json` fixture with
 * its 41 `named` frames, both postdate it. `go.mod` pins what this repo's own Go compiles against,
 * not what a machine runs.
 *
 * Two things a reader should not expect to find here, both consequences of the route rather than
 * oversights:
 *
 *   - **A part can look model-less while RDK has a real model for it.** `kinematics` is empty
 *     whenever `SimpleModel.modelConfig` is nil, which includes a model assembled from frames rather
 *     than parsed from a config. `ToProtobuf` ships only `modelConfig`, so there is nothing to read.
 *   - **`primary_output_frame` never arrives.** RDK's model envelope carries
 *     `{name, model, limits, internal_fs, primary_output_frame}` and `ToProtobuf` sends only
 *     `model`, so `frameDescriptors`' primary end-effector source cannot fire on this route and it
 *     always falls through to `output_frames[0]` / the sole leaf. A branching model that declares no
 *     output frame will not get its end-effector remap here even though the replayer does.
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

interface ModelNode {
	id?: string
	parent?: string
}

/**
 * A node RDK would accept, with everything the emit loops need already resolved, so they can run
 * without per-node guards. `config` is the node verbatim, because `frameDescriptors` reads an axis
 * and a mimic off it that this file has no reason to model.
 */
interface DrawableNode {
	id: string
	parent?: string
	config: unknown
}

interface DrawableJoint extends DrawableNode {
	motion: 'rotational' | 'translational'
}

/** A model every one of whose nodes RDK would have accepted. */
interface DrawableModel {
	/** The raw config, carried on the `model` frame for `modelJointColumns` to read joint order from. */
	config: ModelConfig
	links: DrawableNode[]
	joints: DrawableJoint[]
}

/**
 * Only a missing or empty name means "unnamed"; a numeric `0` is read as a name.
 *
 * Narrowed from `string | number`, which nothing on this route can produce: `LinkConfig.ID` and
 * `JointConfig.ID` are Go `string`s, so `StructToStructPb` can only emit a StringValue, and a
 * numeric id fails `json.Unmarshal` before a model is ever built. The URDF converter reads
 * `jointElem.Name` (`referenceframe/model_urdf.go`), an element's name attribute rather than its
 * index, so that route cannot produce one either. The explicit `undefined`/`''` test rather than a
 * truth test is defensive against a `Struct` carrying a `NumberValue` regardless.
 */
const nodeName = (value: string | undefined): string | undefined =>
	value === undefined || value === '' ? undefined : value

/**
 * `kinematics` arrives as a `google.protobuf.Struct`, whose fields are boxed `Value` messages —
 * `toJson` is what turns it back into the plain `ModelConfigJSON` that RDK marshalled.
 *
 * It is present but *empty* for a part with no model, so emptiness is decided by content rather
 * than presence. Not because RDK marshals a zero `ModelConfigJSON` — that would carry `"name": ""`,
 * since `Name` has no `omitempty`. It is `protoutils.structToMap` short-circuiting on the nil
 * `*ModelConfigJSON` pointer before it marshals anything.
 *
 * **A model with any node RDK would have rejected is rejected whole**, and the part falls through
 * to the model-less path, which is what RDK does: `JointConfig.ToFrame` returns
 * `NewUnsupportedJointTypeError` for anything but revolute and prismatic, and `UnmarshalModelJSON`
 * propagates that error rather than skipping the joint, so the part ends up with no model frame at
 * all. Skipping the single node instead left its children naming a frame that was never emitted;
 * they were not dropped with it but rooted at the scene origin, so an unsupported joint scattered
 * the rest of the arm across the floor rather than, as the old comment here claimed, keeping it out
 * of the chain. A fuzz of 4,000 configs produced 933 such dangling parents.
 */
const drawableModelOf = (
	kinematics: Struct | undefined,
	partName: string
): DrawableModel | undefined => {
	if (!kinematics) return undefined

	const config = kinematics.toJson() as ModelConfig
	const skip = (reason: string): undefined => {
		console.warn(`[motion] "${partName}" ${reason} — its model is not drawn`)
		return undefined
	}

	// Checked before the links/joints test below rather than after it, which is where this used
	// to sit and why it could never print: a DH config carries `dhParams` and no `links` or
	// `joints`, so it was already being discarded as model-less one line earlier. DH expands into
	// a joint/link pair per parameter, which reading it as SVA would render as an armless chain.
	if (config.kinematic_param_type === 'DH') return skip('uses DH kinematics, which are unsupported')

	// `Array.isArray` rather than a length test, because these come off a `Struct` and can be any
	// JSON shape. `{ length: 2 }` used to pass a length check and then throw on iteration, taking
	// every other part down with it; a string passed and iterated character by character.
	const rawLinks = Array.isArray(config.links) ? config.links : []
	const rawJoints = Array.isArray(config.joints) ? config.joints : []
	if (rawLinks.length === 0 && rawJoints.length === 0) return undefined

	const links: DrawableNode[] = []
	for (const link of rawLinks) {
		const id = nodeName(link.id)
		if (id === undefined) return skip('has a link with no id')
		links.push({ id, parent: link.parent, config: link })
	}

	const joints: DrawableJoint[] = []
	for (const joint of rawJoints) {
		const id = nodeName(joint.id)
		if (id === undefined) return skip('has a joint with no id')
		const motion = jointFrameType(joint.type)
		if (!motion) return skip(`has joint "${id}" of unsupported type "${String(joint.type)}"`)
		joints.push({ id, parent: joint.parent, motion, config: joint })
	}

	return { config, links, joints }
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
		// One malformed part costs its own frames and no one else's. `Struct.toJson()` throws on a
		// non-finite number and on a `Value` with no kind set, and an uncaught throw here took the
		// whole scene with it: no preview at all rather than one part missing. RDK's own marshal
		// refuses `±Inf` first, but its URDF converter does produce infinite limits for a continuous
		// joint, so the value exists upstream and only that step stands between it and here.
		try {
			addPart(part, frames, parents)
		} catch (error) {
			console.warn(
				`[motion] could not read the frame config for "${part.frame?.referenceFrame ?? 'an unnamed part'}" — not drawn`,
				error
			)
		}
	}

	return { frames, parents }
}

const addPart = (
	part: robotApi.FrameSystemConfig,
	frames: Record<string, RawFrame>,
	parents: Record<string, string>
): void => {
	const transform = part.frame
	const name = transform?.referenceFrame
	// The world root is not a part and has no offset of its own to place. `!transform` is redundant
	// with `!name` at runtime and load-bearing for the narrowing below.
	if (!transform || !name || name === WORLD) return

	const origin = originName(name)
	// Not a documented default: RDK hard-errors with `ErrEmptyStringFrameName` on an empty frame
	// name, encoding and decoding alike, so a reply carrying one never came from a healthy server.
	// Rooting it at the world keeps the rest of the scene drawable instead of dropping the part.
	// `||` and not `??`, because the empty string is the case being defended against.
	parents[origin] = transform.poseInObserverFrame?.referenceFrame || WORLD

	const model = drawableModelOf(part.kinematics, name)
	const geometry = toLocalGeometry(transform.physicalObject)

	// Unconditional, because RDK builds `p_origin` from the part's frame config and nothing else:
	// `createFramesFromPart` calls `ToStaticFrame(FrameConfig.Name() + "_origin")` before it looks at
	// the model at all, and `ToStaticFrame` attaches the geometry whenever one is configured. Whether
	// the part has a model has no bearing on it. Skipping it for modelled parts cost an arm with a
	// configured safety envelope that entire collision volume, silently, in a view whose whole job is
	// to show what a move would hit.
	frames[origin] = decodedFrame(new Pose().copy(transform.poseInObserverFrame?.pose), geometry)

	parents[name] = origin

	if (!model) {
		// Present but empty: descendants parent to the bare name, and `buildFrameContexts` needs
		// the entry to resolve their context.
		frames[name] = decodedFrame(new Pose(), null)
		return
	}

	// A model with no degrees of freedom and a configured geometry is not published as a model at
	// all: `createFramesFromPart` replaces the model frame with a bare static one, and a static frame
	// is not flattenable (`asFlattenableModel` returns nil for it), so the part emits no `p:<link>`
	// frames. RDK's predicate is `len(modelFrame.DoF()) == 0 && len(offsetGeom.Geometries()) > 0`,
	// which for an SVA model is the joint count. The user's shape was meant to *replace* the model's,
	// and drawing the links anyway shows collision volumes RDK discarded, doubled up with the one
	// that replaced them — so the stand-in carries no geometry of its own either.
	//
	// The stand-in sits at identity where RDK puts it at `modelFrame.Transform([]Input{})`, the
	// model's zero-input pose. That is the model's whole extent at rest, not a small internal offset:
	// a two-link gripper 10 mm + 40 mm long puts RDK's frame 50 mm out. Reaching for it here would
	// mean a second forward-kinematics implementation. Anything parented to the bare part name is off
	// by that much, and nothing else is.
	if (model.joints.length === 0 && geometry) {
		frames[name] = decodedFrame(new Pose(), null)
		return
	}

	// The model frame itself draws nothing; it exists so `buildFrameContexts` can read the joint
	// order out of it and remap anything parented to the bare part name onto the end effector. `name`
	// is unread but kept, because this is meant to look like RDK's own model envelope.
	frames[name] = { frame_type: 'model', frame: { name, model: model.config } }

	// Links before joints, matching the order RDK writes its own `transforms` map in
	// `UnmarshalModelJSON`. It shows through: `buildFrameContexts` builds its child index by
	// iterating `parents`, and the end-effector fallback takes the first child of the last joint, so
	// swapping these can silently re-parent everything hung off the bare part name.
	for (const link of model.links) {
		const frameName = `${name}:${link.id}`
		frames[frameName] = {
			frame_type: 'named',
			frame: { name: frameName, inner_frame: { frame_type: 'static', frame: link.config } },
		}
		parents[frameName] = modelInternalParent(name, link.parent)
	}

	for (const joint of model.joints) {
		const frameName = `${name}:${joint.id}`
		frames[frameName] = {
			frame_type: 'named',
			frame: { name: frameName, inner_frame: { frame_type: joint.motion, frame: joint.config } },
		}
		parents[frameName] = modelInternalParent(name, joint.parent)
	}
}
