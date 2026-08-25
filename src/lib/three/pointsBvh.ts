import type { BufferGeometry } from 'three'

import { type BVHOptions, CENTER, PointsBVH, SKIP_GENERATION } from 'three-mesh-bvh'

declare module 'three-mesh-bvh' {
	// Exported from the package entry point, and read by the constructor, but left out of the
	// type declarations on both counts.
	export const SKIP_GENERATION: unique symbol

	interface BVHOptions {
		[SKIP_GENERATION]?: boolean
	}
}

export const pointsBvhOptions = {
	// `SAH` weighs primitive surface area, which is zero for a point. It builds 4x slower than
	// `CENTER` on a 500k cloud and raycasts slower too.
	strategy: CENTER,
	// A direct build permutes `geometry.index`, so the point budget's draw-range prefix would
	// draw one corner of the cloud instead of the parse-time shuffle's uniform subsample.
	indirect: true,
	maxDepth: 40,
	targetLeafSize: 20,
} satisfies BVHOptions

/** The whole of a built tree, in two buffers that transfer across a worker boundary. */
export interface SerializedPointsBvh {
	roots: ArrayBuffer[]
	/** Narrows to `Uint16Array` at or below 65536 points, so neither type can be assumed. */
	indirectBuffer: Uint16Array | Uint32Array
}

/**
 * `three-mesh-bvh` publishes `serialize` and `deserialize` on `MeshBVH` alone, so a `PointsBVH`
 * can only be moved through the two fields those methods themselves read.
 */
interface PointsBvhInternals {
	_roots: ArrayBuffer[]
	_indirectBuffer: Uint16Array | Uint32Array
}

/**
 * Builds the tree wherever the points are already being walked, so the main thread never pays
 * for it. Costs roughly as much as parsing the cloud it came from.
 *
 * @returns `undefined` for a geometry carrying no position attribute, which some PCDs from Viam
 *   APIs parse into and the constructor throws on.
 */
export const buildPointsBvh = (geometry: BufferGeometry): SerializedPointsBvh | undefined => {
	if (!geometry.attributes.position) return undefined

	const bvh = new PointsBVH(geometry, pointsBvhOptions) as unknown as PointsBvhInternals

	return { roots: bvh._roots, indirectBuffer: bvh._indirectBuffer }
}

/**
 * Reconstitutes a tree built elsewhere around `geometry`, without walking a point.
 * `SKIP_GENERATION` is the same escape hatch `MeshBVH.deserialize` uses to build the shell of a
 * tree it is about to fill in.
 */
export const attachPointsBvh = (geometry: BufferGeometry, serialized: SerializedPointsBvh) => {
	const bvh = new PointsBVH(geometry, { ...pointsBvhOptions, [SKIP_GENERATION]: true })
	const internals = bvh as unknown as PointsBvhInternals

	internals._roots = serialized.roots
	internals._indirectBuffer = serialized.indirectBuffer

	geometry.boundsTree = bvh
}
