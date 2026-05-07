import type { GLTF as ThreeGltf } from 'three/examples/jsm/loaders/GLTFLoader.js'

import { Geometry as ViamGeometry } from '@viamrobotics/sdk'
import { type Entity, trait } from 'koota'
import { BufferGeometry as ThreeBufferGeometry } from 'three'

import { createBufferGeometry, updateBufferGeometry } from '$lib/attribute'
import { ColorFormat } from '$lib/buf/draw/v1/metadata_pb'
import { createBox, createCapsule, createSphere } from '$lib/geometry'
import { parsePcdInWorker } from '$lib/loaders/pcd'
import { parsePlyInput } from '$lib/ply'

export const Name = trait(() => '')
export const UUID = trait(() => '')

/**
 * Set on an entity whose desired parent (by name) doesn't yet exist in the
 * world. Replaced with `relations.ChildOf(parentEntity)` once a frame with
 * the matching `Name` is added. Managed by the hierarchy module — call sites
 * should use `hierarchy.setParent` / `hierarchy.parentTraits` rather than
 * adding this trait directly.
 */
export const Orphan = trait(() => '')

/**
 * Static positional offset (e.g. center of a geometry). Stored as a Pose
 * for the rare cases that need OV+theta semantics (currently unused).
 * Never composed through the parent chain — the `WorldMatrix` system
 * doesn't read it.
 */
export const Center = trait({ x: 0, y: 0, z: 0, oX: 0, oY: 0, oZ: 1, theta: 0 })

/**
 * Local transform: column-major 4×4 matrix stored as 16 numeric fields
 * (SoA-friendly under koota). Use `readTraitToMatrix` / `writeMatrixToTrait`
 * (in `transform.ts`) to bridge to / from `Matrix4`. Identity by default.
 *
 * `m0..m3` is the first column, `m4..m7` the second, etc. — matches
 * `Matrix4.elements`. So `m12,m13,m14` is the translation column.
 */
export const Matrix = trait({
	m0: 1,
	m1: 0,
	m2: 0,
	m3: 0,
	m4: 0,
	m5: 1,
	m6: 0,
	m7: 0,
	m8: 0,
	m9: 0,
	m10: 1,
	m11: 0,
	m12: 0,
	m13: 0,
	m14: 0,
	m15: 1,
})

/** User-staged local transform during a `FrameEditSession`. Same layout as `Matrix`. */
export const EditedMatrix = trait({
	m0: 1,
	m1: 0,
	m2: 0,
	m3: 0,
	m4: 0,
	m5: 1,
	m6: 0,
	m7: 0,
	m8: 0,
	m9: 0,
	m10: 1,
	m11: 0,
	m12: 0,
	m13: 0,
	m14: 0,
	m15: 1,
})

/**
 * Live local transform from the robot's kinematics. Composed with `Matrix`
 * (network baseline) and `EditedMatrix` to produce the rendered transform.
 */
export const LiveMatrix = trait({
	m0: 1,
	m1: 0,
	m2: 0,
	m3: 0,
	m4: 0,
	m5: 1,
	m6: 0,
	m7: 0,
	m8: 0,
	m9: 0,
	m10: 1,
	m11: 0,
	m12: 0,
	m13: 0,
	m14: 0,
	m15: 1,
})

/**
 * Cumulative world-space transform — `parent.WorldMatrix × local rendered`.
 * Maintained by `provideWorldMatrix`. Read by hover label placement,
 * batched-mesh population, and any other consumer that needs world-space.
 */
export const WorldMatrix = trait({
	m0: 1,
	m1: 0,
	m2: 0,
	m3: 0,
	m4: 0,
	m5: 1,
	m6: 0,
	m7: 0,
	m8: 0,
	m9: 0,
	m10: 1,
	m11: 0,
	m12: 0,
	m13: 0,
	m14: 0,
	m15: 1,
})

/** World-space transform of a hovered instance inside a points/arrows batch. */
export const InstancedMatrix = trait({
	m0: 1,
	m1: 0,
	m2: 0,
	m3: 0,
	m4: 0,
	m5: 1,
	m6: 0,
	m7: 0,
	m8: 0,
	m9: 0,
	m10: 1,
	m11: 0,
	m12: 0,
	m13: 0,
	m14: 0,
	m15: 1,
	index: -1,
})

export const Hovered = trait(() => true)
export const Invisible = trait(() => true)

/**
 * Represents that an entity is composed of many instances, so that the treeview and
 * details panel may display all instances
 */
export const Instanced = trait(() => true)

export const Instance = trait({
	meshID: -1,
	instanceID: -1,
})

export const RenderOrder = trait(() => 0)

export const Opacity = trait(() => 1)

/**
 * The color of an object
 * @default { r: 1, g: 0, b: 0 }
 */
export const Color = trait({ r: 0, g: 0, b: 0 })

/**
 * Material properties
 */
export const Material = trait({
	depthTest: false,
	depthWrite: true,
})

export const DepthTest = trait(() => true)

export const Arrow = trait(() => true)

export const Positions = trait(() => new Float32Array() as Float32Array)

/** Per-vertex RGB colors packed as [r, g, b, ...], stride of 3, values 0-255. */
export const Colors = trait(() => new Uint8Array() as Uint8Array)

/**
 * Per-vertex opacity values packed as uint8 (0-255).
 */
export const Opacities = trait(() => new Uint8Array())

export const Instances = trait({
	count: 0,
})

export const Arrows = trait({
	headAtPose: true,
})

/**
 * Render entity as points
 */
export const Points = trait(() => true)

/**
 * A box, in mm
 */
export const Box = trait({ x: 200, y: 200, z: 200 })

/**
 * A capsule, in mm
 */
export const Capsule = trait({ l: 200, r: 50 })

/**
 * A sphere, in mm
 */
export const Sphere = trait({ r: 200 })

export const BufferGeometry = trait(() => new ThreeBufferGeometry())

export const GLTF = trait(() => ({
	source: { url: '' } as { url: string } | { gltf: ThreeGltf } | { glb: Uint8Array },
	animationName: '',
}))

export const Scale = trait({ x: 1, y: 1, z: 1 })

export const FramesAPI = trait(() => true)
export const GeometriesAPI = trait(() => true)
export const DrawAPI = trait(() => true)
export const DrawServiceAPI = trait(() => true)
export const WorldStateStoreAPI = trait(() => true)
export const SnapshotAPI = trait(() => true)

/**
 * Marker trait for entities created from user-dropped files (PLY, PCD, etc.)
 */
export const DroppedFile = trait(() => true)

/**
 * Marker trait for entities the dashboard's TransformControls may attach to —
 * editable frames and ad-hoc custom geometries. Other entity kinds (lines,
 * points, batched arrows, etc.) are deliberately excluded.
 */
export const Transformable = trait(() => true)

export const ShowAxesHelper = trait(() => true)

/**
 * Marker trait for entities that should be rendered in screen space (CSS pixels)
 */
export const ScreenSpace = trait(() => true)

/**
 * Point size, in mm
 */
export const PointSize = trait(() => 5)

/**
 * Line positions, format [x, y, z, ...]
 */
export const LinePositions = trait(() => new Float32Array() as Float32Array)

/**
 * Line width, in mm when in world units, or CSS pixels when in screen space
 */
export const LineWidth = trait(() => 5)

/**
 * Dot colors for line vertices, format [r, g, b, a, ...]
 */
export const DotColors = trait(() => new Uint8Array() as Uint8Array)

/**
 * Dot size for line vertices, in mm when in world units, or CSS pixels when in screen space
 */
export const DotSize = trait(() => 10)

export const ReferenceFrame = trait(() => true)

/**
 * Tracks chunk loading progress for progressively-loaded entities.
 * `loaded` is the number of elements received so far; `total` is the target.
 */
export const ChunkProgress = trait({ loaded: 0, total: 0 })

/**
 * Interaction layers for entities
 */
export type InteractionLayerValue = 'selectTool'
export const SelectToolInteractionLayer = trait(() => true)

/**
 * This entity can be safely removed from the scene by the user
 */
export const Removable = trait(() => true)

export const Geometry = (geometry: ViamGeometry) => {
	if (geometry.geometryType.case === 'box') {
		return Box(createBox(geometry.geometryType.value))
	} else if (geometry.geometryType.case === 'capsule') {
		return Capsule(createCapsule(geometry.geometryType.value))
	} else if (geometry.geometryType.case === 'sphere') {
		return Sphere(createSphere(geometry.geometryType.value))
	} else if (geometry.geometryType.case === 'mesh') {
		return BufferGeometry(parsePlyInput(geometry.geometryType.value.mesh))
	}

	return ReferenceFrame
}

export const updateGeometryTrait = (entity: Entity, geometry?: ViamGeometry) => {
	if (!geometry) {
		entity.remove(Box, Capsule, Sphere, BufferGeometry)
		return
	}

	if (geometry.geometryType.case === 'box') {
		if (entity.has(Box)) {
			entity.set(Box, createBox(geometry.geometryType.value))
		} else {
			entity.remove(Capsule, Sphere, BufferGeometry)
			entity.add(Box(createBox(geometry.geometryType.value)))
		}
	} else if (geometry.geometryType.case === 'capsule') {
		if (entity.has(Capsule)) {
			entity.set(Capsule, createCapsule(geometry.geometryType.value))
		} else {
			entity.remove(Box, Sphere, BufferGeometry)
			entity.add(Capsule(createCapsule(geometry.geometryType.value)))
		}
	} else if (geometry.geometryType.case === 'sphere') {
		if (entity.has(Sphere)) {
			entity.set(Sphere, createSphere(geometry.geometryType.value))
		} else {
			entity.remove(Box, Capsule, BufferGeometry)
			entity.add(Sphere(createSphere(geometry.geometryType.value)))
		}
	} else if (geometry.geometryType.case === 'mesh') {
		if (entity.has(BufferGeometry)) {
			entity.set(BufferGeometry, parsePlyInput(geometry.geometryType.value.mesh))
		} else {
			entity.remove(Box, Sphere, Capsule)
			entity.add(BufferGeometry(parsePlyInput(geometry.geometryType.value.mesh)))
		}
	} else if (geometry.geometryType.case === 'pointcloud') {
		updatePointCloud(entity, geometry.geometryType.value.pointCloud)
	}
}

const updatePointCloud = (entity: Entity, pointCloud: Uint8Array): void => {
	parsePcdInWorker(new Uint8Array(pointCloud))
		.then((parsed) => {
			if (!entity.isAlive()) return

			const buffer = entity.get(BufferGeometry)
			let colors = parsed.colors
			if (buffer) {
				// Reapply single color trait if the point count changed
				if (parsed.colors === undefined) {
					const color = entity.get(Color)
					if (color) {
						const newCount = parsed.positions.length / 3
						colors = new Uint8Array(newCount * 3)
						const r = Math.round(color.r * 255)
						const g = Math.round(color.g * 255)
						const b = Math.round(color.b * 255)
						for (let i = 0; i < newCount; i++) {
							colors[i * 3] = r
							colors[i * 3 + 1] = g
							colors[i * 3 + 2] = b
						}
					}
				}

				// When the point count changes, attributes must be reallocated.
				const oldCount = buffer.getAttribute('position').count
				const newCount = parsed.positions.length / 3
				if (oldCount === newCount) {
					updateBufferGeometry(buffer, parsed.positions, {
						colors,
						colorFormat: ColorFormat.RGB,
					})
				} else {
					const fresh = createBufferGeometry(parsed.positions, {
						colors,
						colorFormat: ColorFormat.RGB,
					})
					buffer.dispose()
					entity.set(BufferGeometry, fresh)
				}

				return
			}

			entity.remove(Box, Capsule, Sphere)
			entity.add(
				BufferGeometry(
					createBufferGeometry(parsed.positions, {
						colors: parsed.colors,
						colorFormat: ColorFormat.RGB,
					})
				)
			)
			if (!entity.has(Points)) entity.add(Points)
		})
		.catch((error) => {
			console.error('Failed to update pointcloud buffer geometry:', error)
		})
}
