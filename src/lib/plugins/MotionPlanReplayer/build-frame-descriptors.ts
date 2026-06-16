import { Quaternion } from 'three'

import { quaternionToPose } from '$lib/transform'

import type { ParsedPlan } from './parse-plan'

import { planUuid } from './plan-uuid'

export interface GeometryDescriptor {
	type: 'box' | 'sphere' | 'capsule'
	x?: number
	y?: number
	z?: number
	r?: number
	l?: number
	centerPose: { x: number; y: number; z: number; oX: number; oY: number; oZ: number; theta: number }
	label: string
}

export interface StaticFrameDescriptor {
	kind: 'static'
	name: string
	parent: string
	localPose: { x: number; y: number; z: number; oX: number; oY: number; oZ: number; theta: number }
	geometry: GeometryDescriptor | null
	uuid: Uint8Array<ArrayBuffer>
}

export interface RotationalFrameDescriptor {
	kind: 'rotational'
	name: string
	parent: string
	axis: { X: number; Y: number; Z: number }
	componentName: string
	jointIndex: number
	uuid: Uint8Array<ArrayBuffer>
}

export type FrameDescriptor = StaticFrameDescriptor | RotationalFrameDescriptor

// Shared scratch — safe in single-threaded JS
const tmpQ = new Quaternion()

type QuatJson = { W: number; X: number; Y: number; Z: number }
type OrientJson = { type: string; value: QuatJson } | undefined
type Vec3Json = { X: number; Y: number; Z: number } | undefined

const quaternionFromJson = (orientation: OrientJson): Quaternion => {
	if (orientation?.type === 'quaternion' && orientation.value) {
		const v = orientation.value
		// Three.js Quaternion: (x, y, z, w) — W is LAST
		return tmpQ.set(v.X, v.Y, v.Z, v.W)
	}
	return tmpQ.set(0, 0, 0, 1)
}

const poseFromFrame = (
	translation: Vec3Json,
	orientation: OrientJson
): StaticFrameDescriptor['localPose'] => {
	const pose = {
		x: translation?.X ?? 0,
		y: translation?.Y ?? 0,
		z: translation?.Z ?? 0,
		oX: 0,
		oY: 0,
		oZ: 0,
		theta: 0,
	}
	quaternionToPose(quaternionFromJson(orientation), pose)
	return pose
}

const parseGeometry = (geom: unknown): GeometryDescriptor | null => {
	if (!geom || typeof geom !== 'object') return null
	const g = geom as Record<string, unknown>
	const type = g.type as string
	if (type !== 'box' && type !== 'sphere' && type !== 'capsule') return null

	const trans = g.translation as Vec3Json
	const orient = g.orientation as OrientJson
	const centerPose = {
		x: trans?.X ?? 0,
		y: trans?.Y ?? 0,
		z: trans?.Z ?? 0,
		oX: 0,
		oY: 0,
		oZ: 0,
		theta: 0,
	}
	if (orient?.type === 'quaternion' && orient.value) {
		quaternionToPose(quaternionFromJson(orient), centerPose)
	}

	return {
		type: type as GeometryDescriptor['type'],
		x: g.x as number | undefined,
		y: g.y as number | undefined,
		z: g.z as number | undefined,
		r: g.r as number | undefined,
		l: g.l as number | undefined,
		centerPose,
		label: (g.Label ?? g.label ?? '') as string,
	}
}

export const buildFrameDescriptors = (plan: ParsedPlan): FrameDescriptor[] => {
	const { frames, parents } = plan

	// Pass 1: map component name → ordered joint frame names, from "model" frames
	const jointMap = new Map<string, string[]>()
	for (const [frameName, entry] of Object.entries(frames)) {
		if (entry.frame_type !== 'model') continue
		const model = (entry.frame as Record<string, unknown>).model as
			| Record<string, unknown>
			| undefined
		const joints = model?.joints as Array<{ id: string }> | undefined
		if (!joints) continue
		jointMap.set(
			frameName,
			joints.map((j) => `${frameName}:${j.id}`)
		)
	}

	// Pass 2: build descriptors — skip model frames, classify named as static/rotational
	const descriptors: FrameDescriptor[] = []

	for (const [frameName, entry] of Object.entries(frames)) {
		const parent = parents[frameName] ?? 'world'

		switch (entry.frame_type) {
			case 'model': {
				continue
			}

			case 'named': {
				const outer = entry.frame as Record<string, unknown>
				const inner = outer.inner_frame as Record<string, unknown>
				const innerData = inner.frame as Record<string, unknown>

				if (inner.frame_type === 'static') {
					descriptors.push({
						kind: 'static',
						name: frameName,
						parent,
						localPose: poseFromFrame(
							innerData.translation as Vec3Json,
							innerData.orientation as OrientJson
						),
						geometry: parseGeometry(innerData.geometry),
						uuid: planUuid(),
					})
				} else if (inner.frame_type === 'rotational') {
					let componentName = ''
					let jointIndex = -1
					for (const [comp, names] of jointMap) {
						const idx = names.indexOf(frameName)
						if (idx !== -1) {
							componentName = comp
							jointIndex = idx
							break
						}
					}
					if (!componentName) continue

					descriptors.push({
						kind: 'rotational',
						name: frameName,
						parent,
						axis: innerData.axis as { X: number; Y: number; Z: number },
						componentName,
						jointIndex,
						uuid: planUuid(),
					})
				}
				break
			}

			case 'tail_geometry_static':
			case 'static': {
				const frame = entry.frame as Record<string, unknown>
				descriptors.push({
					kind: 'static',
					name: frameName,
					parent,
					localPose: poseFromFrame(frame.translation as Vec3Json, frame.orientation as OrientJson),
					geometry: parseGeometry(frame.geometry),
					uuid: planUuid(),
				})
				break
			}
		}
	}

	return descriptors
}
