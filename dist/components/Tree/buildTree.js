/**
 * Creates a tree representing parent child / relationships from a set of frames.
 */
export const buildTreeNodes = (objects) => {
    const nodeMap = new Map();
    const rootNodes = [];
    for (const object of objects) {
        const node = {
            name: object.name,
            id: object.uuid,
            children: [],
            href: `/selection/${object.name}`,
        };
        nodeMap.set(object.name, node);
        if (object.referenceFrame === 'world') {
            rootNodes.push(node);
        }
    }
    for (const object of objects) {
        if (object.referenceFrame !== 'world') {
            const parentNode = nodeMap.get(object.referenceFrame);
            const child = nodeMap.get(object.name);
            if (parentNode && child) {
                parentNode.children?.push(child);
            }
        }
    }
    return rootNodes;
};
