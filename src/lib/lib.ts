// Components
// NOTE: These components should be pure and not use any hooks if you add a new component to export here
// ensure you write a corresponding unit test to assert the component works in absence of parent providers in /src/lib/__tests__/PureComponents.svelte.spec.ts
export { default as AxesHelper } from './components/AxesHelper.svelte'

// Snapshot component (uses context, requires MotionTools parent)
export { default as Snapshot } from './components/Snapshot.svelte'
export { Snapshot as SnapshotProto } from '$lib/buf/draw/v1/snapshot_pb'

// Classes
export { BatchedArrow } from './three/BatchedArrow'
export { CapsuleGeometry } from './three/CapsuleGeometry'
export { OrientationVector } from './math/OrientationVector'

// Functions
export { parsePcdInWorker } from './loaders/pcd'
export { createBinaryPCD } from './pcd'
export { metadataFromStruct } from './metadata'
export { decodeDrawnSnapshotPointClouds } from './snapshot'
