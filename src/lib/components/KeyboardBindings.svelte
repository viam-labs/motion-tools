<script lang="ts">
	import { PressedKeys } from 'runed'

	import { traits, useQuery } from '$lib/ecs'
	import { useSettings } from '$lib/hooks/useSettings.svelte'

	const selected = useQuery(traits.Selected)

	const settings = useSettings()
	const keys = new PressedKeys()

	keys.onKeys('c', () => {
		settings.current.cameraMode =
			settings.current.cameraMode === 'perspective' ? 'orthographic' : 'perspective'
	})

	keys.onKeys('1', () => {
		settings.current.transformMode = 'translate'
	})

	keys.onKeys('2', () => {
		settings.current.transformMode = 'rotate'
	})

	keys.onKeys('3', () => {
		settings.current.transformMode = 'scale'
	})

	keys.onKeys('h', () => {
		for (const entity of selected.current) {
			if (entity?.has(traits.Invisible)) {
				entity.remove(traits.Invisible)
			} else {
				entity?.add(traits.Invisible)
			}
		}
	})
</script>
