import type { Entity, World } from 'koota'

import { traits } from '$lib/ecs'

export const clearSelection = (world: World) => {
	for (const entity of world.query(traits.Selected)) {
		entity.remove(traits.Selected)
	}
}

export const selectOnly = (world: World, entity: Entity) => {
	clearSelection(world)
	entity.add(traits.Selected)
}
