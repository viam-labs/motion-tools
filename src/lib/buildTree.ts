import type { Frame } from './hooks/useFrames.svelte'

export interface TreeNode {
	id: string
	name: string
	children?: TreeNode[]
	href: string
}

type FrameData = Omit<Frame, 'pose' | 'geometry'>

/**
 * Creates a tree representing parent child / relationships from a set of frames.
 */
export const buildTreeNodes = (frames: FrameData[]): TreeNode => {
	const nodeMap = new Map<string, TreeNode>()
	const rootNodes = []

	for (const frame of frames) {
		const { name } = frame
		const node: TreeNode = {
			name,
			id: name,
			children: [],
			href: `/selection/${name}`,
		}

		nodeMap.set(name, node)

		if (frame.parent === 'world') {
			rootNodes.push(node)
		}
	}

	for (const { name, parent } of frames) {
		if (parent !== 'world') {
			const parentNode = nodeMap.get(parent)
			const child = nodeMap.get(name)
			if (parentNode && child) {
				parentNode.children?.push(child)
			}
		}
	}

	return {
		id: 'world',
		name: 'World',
		children: rootNodes,
		href: '/',
	}
}
