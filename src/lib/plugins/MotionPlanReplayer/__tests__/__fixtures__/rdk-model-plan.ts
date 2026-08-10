import type { ParsedPlan } from '../../parse-plan'

/**
 * Publishes one of RDK's own model configs the way a plan reply carries it.
 *
 * `flattenModelIntoFS` re-publishes every frame inside a model —
 * mimic joints included — under `component:internalName`, attaching anything parented to the model's
 * internal world to whatever the model itself hangs off. That is the only reason a mimic joint is
 * drawable at all: it reaches us as an ordinary frame, with nothing on it to say it has no column.
 *
 * `rdk-mimic-*-model.json` are byte-for-byte copies of `referenceframe/testfiles/`, so they are
 * spelled the way a person writes config: lowercase `{x,y,z}`, which Go unmarshals case-insensitively.
 * RDK marshals `r3.Vector` back out under its Go field names, so a real dump spells those `{X,Y,Z}` —
 * the one difference this bridges. Geometry is dropped rather than translated: these tests are about
 * which column drives a joint, and a shape would only add a second thing that could be wrong.
 *
 * Where this is *not* faithful, and deliberately: the envelope carries `name` and `model` only. A
 * real dump also carries `primary_output_frame`, `limits` and `internal_fs`, and all 29 model frames
 * across the four captures here have the first of those set. So `modelOutputFrame` takes its first
 * rung on real data and its later ones here. That is fine for what these tests ask, which is which
 * column drives which joint, but it does mean nothing in this file exercises the path a machine
 * actually takes, and a test written against this shape is not evidence about that path.
 */

interface Vec3 {
	x?: number
	y?: number
	z?: number
}

interface RdkLink {
	id: string
	parent?: string
	translation?: Vec3
}

interface RdkJoint {
	id: string
	type: string
	parent: string
	axis: Vec3
	mimic?: { joint: string; multiplier?: number; offset?: number }
}

export interface RdkModel {
	name: string
	links: RdkLink[]
	joints: RdkJoint[]
	output_frames?: string[]
}

const upper = (v: Vec3 = {}): { X: number; Y: number; Z: number } => ({
	X: v.x ?? 0,
	Y: v.y ?? 0,
	Z: v.z ?? 0,
})

const MOTION: Record<string, 'rotational' | 'translational'> = {
	revolute: 'rotational',
	prismatic: 'translational',
}

export const rdkModelPlan = (
	model: RdkModel,
	trajectory: ParsedPlan['trajectory'] = []
): ParsedPlan => {
	const component = model.name
	const frames: ParsedPlan['frames'] = {
		[component]: { frame_type: 'model', frame: { name: component, model } },
	}
	const parents: ParsedPlan['parents'] = {}

	// `world` here is the model's *internal* world, which flattening replaces with the model's own
	// attachment point. These fixtures hang off the real world, so the two spell the same.
	const namespaced = (id: string): string => (id === 'world' ? 'world' : `${component}:${id}`)

	for (const link of model.links) {
		frames[`${component}:${link.id}`] = {
			frame_type: 'named',
			frame: {
				inner_frame: {
					frame_type: 'static',
					frame: { translation: upper(link.translation), orientation: null },
				},
			},
		}
		parents[`${component}:${link.id}`] = namespaced(link.parent ?? 'world')
	}

	for (const joint of model.joints) {
		frames[`${component}:${joint.id}`] = {
			frame_type: 'named',
			frame: {
				inner_frame: { frame_type: MOTION[joint.type]!, frame: { axis: upper(joint.axis) } },
			},
		}
		parents[`${component}:${joint.id}`] = namespaced(joint.parent)
	}

	return {
		frames,
		parents,
		trajectory,
		goals: [],
		obstaclesInWorldFrame: undefined,
		worldState: undefined,
	}
}
