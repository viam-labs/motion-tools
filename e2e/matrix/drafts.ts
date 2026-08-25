import fs from 'node:fs'
import path from 'node:path'
import url from 'node:url'

import type { EntityDraft, EntityKind } from '../../src/lib/__tests__/__fixtures__/entityDrafts'
import type { EntityTypeDescriptor } from '../../src/lib/__tests__/__fixtures__/entityMatrix'

import { Mesh, PointCloud } from '../../src/lib/buf/common/v1/common_pb'

const dirname = path.dirname(url.fileURLToPath(import.meta.url))
const repoRoot = path.resolve(dirname, '../..')

// Uint8Array.from, not the Buffer itself: proto bytes fields are typed
// Uint8Array<ArrayBuffer>, and a Buffer's backing store is ArrayBufferLike.
const readAsset = (relativePath: string): Uint8Array<ArrayBuffer> =>
	Uint8Array.from(fs.readFileSync(path.resolve(repoRoot, relativePath)))

/**
 * The parity spec mocks the PLY and GLTF loaders, so its drafts carry an empty
 * mesh and a placeholder URL. A browser runs the real loaders, so the e2e
 * substitutes assets that parse. Small ones: every cell of the mesh and model
 * rows resends them.
 */
const PLY_MESH = readAsset('client/data/lod_100.ply')
const GLB_MODEL = readAsset('static/models/threlte.glb')
// The smallest cloud with colours, so the cells exercise the real decode path.
const PCD_CLOUD = readAsset('client/data/octagon.pcd')

/** Where the `reparent` cases attach, one metre out along x so the composed world pose differs from the local one. */
export const PARENT_POSE = { x: 1000, y: 0, z: 0 }

const withRealAssets = (type: EntityTypeDescriptor, draft: EntityDraft): EntityDraft => {
	if (type.name === 'mesh') {
		return {
			...draft,
			geometry: { case: 'mesh', value: new Mesh({ contentType: 'ply', mesh: PLY_MESH }) },
		}
	}

	if (type.name === 'pcd') {
		return {
			...draft,
			geometry: { case: 'pointcloud', value: new PointCloud({ pointCloud: PCD_CLOUD }) },
		}
	}

	if (type.name === 'model') {
		return {
			...draft,
			shape: {
				case: 'model',
				value: {
					assets: [{ mimeType: 'model/gltf-binary', content: { case: 'data', value: GLB_MODEL } }],
				},
			},
		}
	}

	return draft
}

/** A fresh draft for `type`, named after it, carrying assets a browser can load. */
export const matrixDraft = (type: EntityTypeDescriptor): EntityDraft =>
	withRealAssets(type, type.draft(type.name))

/** The frame `reparent` cases attach to. A bare transform, so it renders as axes. */
export const parentDraft = (name: string, kind: EntityKind = 'transform'): EntityDraft => ({
	name,
	kind,
	uuid: 2,
	pose: { ...PARENT_POSE },
	metadata: {},
})

/**
 * Types whose default draft puts pixels on the canvas, so a visibility case can
 * be proved by comparing the canvas to an empty scene. A frame is not one of
 * them: `AxesHelpers` draws only for `ShowAxesHelper`, so a frame carrying
 * neither geometry nor that trait renders nothing.
 *
 * A point cloud is not one of them either, for a reason worth chasing
 * separately. It mounts correctly, a `Points` object carrying every vertex and
 * a colour attribute, visible and at the origin, and its trait cells all read
 * the state they should. Nothing reaches the canvas. Its material size comes
 * out at 0.01 world units while the cloud spans about one, because point cloud
 * positions travel raw where every other geometry here is given in millimetres
 * and converted, and a synthetic cloud rescaled to match did not render either.
 * Whatever the cause, it is a renderer question rather than a wiring one, and
 * the pixel proof stays off until it is answered.
 */
export const RENDERS_PIXELS = new Set([
	'box',
	'sphere',
	'capsule',
	'mesh',
	'points',
	'line',
	'nurbs',
	'arrows',
])
