<!--
@component

Ghosts everything hanging off the frame being moved — a gripper on the wrist,
the gripper's own `GetGeometries` shapes, a camera above it, and so on down the
tree. Recurses through `ChildOf`, so each level renders its own children.

The whole subtree rides one world-space delta: attached frames are rigid with
respect to the frame the gizmo drags, so previewing them is a single premultiply
rather than a re-solve.

The exception is the dragged frame's *own* `GetGeometries` links, which
`framesOnly` skips at the top level. Those are the arm's links, and they are not
rigid with the end effector: moving it re-solves the chain, so they land
wherever IK puts them rather than offset by the drag. Every level below is
rigid, links included.
-->
<script lang="ts">
	import type { Entity } from 'koota'
	import type { Matrix4 } from 'three'

	import { relations, traits, useQuery } from '$lib/ecs'

	import MoveChildGhosts from './MoveChildGhosts.svelte'
	import MoveFrameGhost from './MoveFrameGhost.svelte'

	interface Props {
		entity: Entity
		delta: Matrix4
		/** Set at the dragged frame to leave its IK-resolved link geometries behind. */
		framesOnly?: boolean
	}

	const { entity, delta, framesOnly = false }: Props = $props()

	// Both queries are built up front — `useQuery` fixes its parameters at
	// creation — and the active one is picked per render.
	const frameChildren = useQuery(relations.ChildOf(entity), traits.FramesAPI)
	const allChildren = useQuery(relations.ChildOf(entity))

	const children = $derived(framesOnly ? frameChildren.current : allChildren.current)
</script>

{#each children as child (child)}
	<MoveFrameGhost
		entity={child}
		{delta}
	/>
	<MoveChildGhosts
		entity={child}
		{delta}
	/>
{/each}
