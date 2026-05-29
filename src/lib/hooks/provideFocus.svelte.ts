import { Not, trait } from 'koota'

import { traits, useWorld } from '$lib/ecs'

import { useEnvironment } from './useEnvironment.svelte'

const HiddenByFocus = trait()

export const provideFocus = () => {
	const world = useWorld()
	const environment = useEnvironment()

	$effect(() => {
		if (environment.current.focusing) {
			for (const entity of world.query(traits.Name, Not(traits.Selected))) {
				if (!entity.has(traits.Invisible)) {
					entity.add(HiddenByFocus, traits.Invisible)
				}
			}
		} else {
			for (const entity of world.query(HiddenByFocus)) {
				entity.remove(HiddenByFocus, traits.Invisible)
			}
		}
	})
}
