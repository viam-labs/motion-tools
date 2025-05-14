import type { WorldObject } from '../../WorldObject';
export interface TreeNode {
    id: string;
    name: string;
    children?: TreeNode[];
    href: string;
}
/**
 * Creates a tree representing parent child / relationships from a set of frames.
 */
export declare const buildTreeNodes: (objects: WorldObject[]) => TreeNode[];
