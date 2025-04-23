import type { Frame } from '$lib/hooks/useFrames.svelte'
import type { Mesh } from 'three'

export interface TreeNode {
	id: string
	name: string
	children?: TreeNode[]
	href: string
}

type FrameData = Omit<Frame, 'pose' | 'geometry'>

const sortTreeByName = (node: TreeNode): TreeNode => {
	if (node.children && node.children.length > 0) {
		node.children.sort((a, b) => a.name.localeCompare(b.name))
		for (const child of node.children) {
			sortTreeByName(child)
		}
	}

	return node
}

/**
 * Creates a tree representing parent child / relationships from a set of frames.
 */
export const buildTreeNodes = (frames: Mesh[]): TreeNode => {
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

		if (frame.userData.parent === 'world') {
			rootNodes.push(node)
		}
	}

	for (const frame of frames) {
		if (frame.userData.parent !== 'world') {
			const parentNode = nodeMap.get(frame.userData.parent)
			const child = nodeMap.get(frame.name)
			if (parentNode && child) {
				parentNode.children?.push(child)
			}
		}
	}

	const nextRoot = sortTreeByName({
		id: 'world',
		name: 'World',
		children: rootNodes,
		href: '/',
	})

	return nextRoot
}
