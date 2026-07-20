<script
	module
	lang="ts"
>
	let index = 0
</script>

<script lang="ts">
	import type { Entity } from 'koota'

	import { PressedKeys } from 'runed'
	import { SvelteSet } from 'svelte/reactivity'

	import { traits, useQuery, useWorld } from '$lib/ecs'
	import { useEnvironment } from '$lib/hooks/useEnvironment.svelte'

	const world = useWorld()
	const selected = useQuery(traits.Selected)
	const environment = useEnvironment()

	const isBuildMode = $derived(environment.current.viewerMode === 'build')

	const entities = new SvelteSet<Entity>()
	const selectedCustomGeometry = $derived(
		[...entities].find((entity) => entity === selected.current[0])
	)

	const keys = new PressedKeys()

	keys.onKeys('=', () => {
		if (!isBuildMode) return

		const entity = world.spawn(
			traits.Name(`custom geometry ${++index}`),
			traits.Matrix,
			traits.Box({ x: 100, y: 100, z: 100 }),
			traits.Removable,
			traits.Transformable
		)

		entities.add(entity)
	})

	keys.onKeys('-', () => {
		if (selectedCustomGeometry) {
			const entity = selectedCustomGeometry
			entity.destroy()
			entities.delete(entity)
		}
	})
</script>
