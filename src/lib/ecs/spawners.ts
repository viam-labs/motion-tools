import type { Entity, World } from 'koota'

import * as traits from './traits'

export type ShapeKind = 'frame' | 'plane' | 'box' | 'sphere' | 'capsule'

const counters: Record<ShapeKind, number> = {
	frame: 0,
	plane: 0,
	box: 0,
	sphere: 0,
	capsule: 0,
}

const baseTraits = (kind: ShapeKind) => [
	traits.Name(`custom ${kind} ${++counters[kind]}`),
	traits.Matrix,
	traits.Removable,
	traits.Transformable,
]

export const spawners: Record<ShapeKind, (world: World) => Entity> = {
	box: (world) =>
		world.spawn(
			...baseTraits('box'),
			traits.Box({ x: 200, y: 200, z: 200 }),
			traits.Color({ r: 0.5, g: 0.5, b: 0.5 })
		),

	sphere: (world) =>
		world.spawn(
			...baseTraits('sphere'),
			traits.Sphere({ r: 100 }),
			traits.Color({ r: 0.5, g: 0.5, b: 0.5 })
		),

	capsule: (world) =>
		world.spawn(
			...baseTraits('capsule'),
			traits.Capsule({ l: 200, r: 50 }),
			traits.Color({ r: 0.5, g: 0.5, b: 0.5 })
		),

	plane: (world) =>
		world.spawn(
			...baseTraits('plane'),
			traits.Plane({ x: 500, y: 500 }),
			traits.Color({ r: 0.5, g: 0.5, b: 0.5 })
		),

	frame: (world) =>
		world.spawn(...baseTraits('frame'), traits.ReferenceFrame, traits.ShowAxesHelper),
}
