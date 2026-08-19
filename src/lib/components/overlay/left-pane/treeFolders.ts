import type { Trait } from 'koota'

import { traits } from '$lib/ecs'

export interface TreeFolder {
	name: string
	sources: Trait[]
}

/** Display order. The last entry has no sources and claims whatever the others don't. */
export const treeFolders: TreeFolder[] = [
	{ name: 'Frames', sources: [traits.FramesAPI] },
	{ name: 'Point clouds', sources: [traits.PointCloudAPI] },
	{ name: 'Point cloud objects', sources: [traits.PointCloudObjectAPI] },
	{ name: 'World state store', sources: [traits.WorldStateStoreAPI] },
	{ name: 'Drawn', sources: [traits.DrawAPI, traits.DrawServiceAPI, traits.SnapshotAPI] },
	{ name: 'Imported files', sources: [traits.DroppedFile] },
	{ name: 'Other', sources: [] },
]
