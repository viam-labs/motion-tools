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
export const buildTreeNodes = (objects: WorldObject[]): TreeNode[] => {
	const nodeMap = new Map<string, TreeNode>()
	const rootNodes = []

	for (const object of objects) {
		const node: TreeNode = {
			name: object.name,
			id: object.uuid,
			children: [],
			href: `/selection/${object.name}`,
		}

		nodeMap.set(object.name, node)

		if (object.referenceFrame === 'world') {
			rootNodes.push(node)
		}
	}

	for (const object of objects) {
		if (object.referenceFrame !== 'world') {
			const parentNode = nodeMap.get(object.referenceFrame)
			const child = nodeMap.get(object.name)
			if (parentNode && child) {
				parentNode.children?.push(child)
			}
		}
	}

	return rootNodes
}
