<script lang="ts">
	import { PressedKeys } from 'runed'

	import { traits, useQuery } from '$lib/ecs'
	import { useEnvironment } from '$lib/hooks/useEnvironment.svelte'
	import { useSettings } from '$lib/hooks/useSettings.svelte'

	const selected = useQuery(traits.Selected)

	const settings = useSettings()
	const environment = useEnvironment()
	const keys = new PressedKeys()

	keys.onKeys('escape', () => {
		if (environment.current.focusing) {
			environment.current.focusing = false
		}
	})

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

	keys.onKeys('/', () => {
		const { focusing } = environment.current
		console.log(focusing)
		if (selected.current.length > 0 && !focusing) {
			environment.current.focusing = true
		} else if (focusing) {
			environment.current.focusing = false
		}
	})
</script>
