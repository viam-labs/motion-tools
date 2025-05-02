import type { WorldObject } from '$lib/WorldObject'

export interface TreeNode {
	id: string
	name: string
	children?: TreeNode[]
	href: string
}

const sortTreeByName = (children: TreeNode[]): TreeNode[] => {
	children.sort((a, b) => a.name.localeCompare(b.name))

	for (const child of children) {
		if (child.children) {
			sortTreeByName(child.children)
		}
	}

	return children
}

/**
 * Creates a tree representing parent child / relationships from a set of frames.
 */
export const buildTreeNodes = (frames: WorldObject[]): TreeNode[] => {
	const nodeMap = new Map<string, TreeNode>()
	const rootNodes = []

	for (const frame of frames) {
		const { name, referenceFrame = 'world' } = frame
		const node: TreeNode = {
			name,
			id: name,
			children: [],
			href: `/selection/${name}`,
		}

		nodeMap.set(name, node)

		if (referenceFrame === 'world') {
			rootNodes.push(node)
		}
	}

	for (const { name, referenceFrame } of frames) {
		if (referenceFrame !== 'world') {
			const parentNode = nodeMap.get(referenceFrame)
			const child = nodeMap.get(name)
			if (parentNode && child) {
				parentNode.children?.push(child)
			}
		}
	}

	return rootNodes
}
