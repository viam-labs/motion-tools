import type { Trait } from 'koota'

import type { RefreshRateId } from '$lib/hooks/useSettings.svelte'

import { traits } from '$lib/ecs'

export interface TreeFolder {
	name: string
	sources: Trait[]
	/** Starts closed instead of open, for a folder that is a side note. */
	collapsed?: boolean
	/** Rows here have no scene object, so they get no visibility toggle. */
	sceneless?: boolean
	/** Poll that fills the folder, which puts refresh controls on its row. */
	refreshRate?: RefreshRateId
}

/** Display order. The last entry has no sources and claims whatever the others don't. */
export const treeFolders: TreeFolder[] = [
	{ name: 'Frames', sources: [traits.FramesAPI], refreshRate: 'poses' },
	{
		name: 'Frameless components',
		sources: [traits.FramelessComponent],
		collapsed: true,
		sceneless: true,
	},
	{ name: 'Point clouds', sources: [traits.PointCloudAPI], refreshRate: 'pointclouds' },
	{ name: 'Point cloud objects', sources: [traits.PointCloudObjectAPI], refreshRate: 'vision' },
	{ name: 'World state store', sources: [traits.WorldStateStoreAPI] },
	{ name: 'Drawn', sources: [traits.DrawAPI, traits.SnapshotAPI] },
	{ name: 'Imported files', sources: [traits.DroppedFile] },
	{ name: 'Other', sources: [] },
]
