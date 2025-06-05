<script lang="ts">
	import { T } from '@threlte/core'
	import { PerspectiveCamera, OrthographicCamera } from 'three'
	import { useSettings } from '$lib/hooks/useSettings.svelte'

	let { children, ...rest } = $props()

	const settings = useSettings()
	const mode = $derived(settings.current.cameraMode)

	const perspective = new PerspectiveCamera()
	perspective.near = 0.01
	perspective.up.set(0, 0, 1)

	const orthographic = new OrthographicCamera()
	orthographic.near = -100
	orthographic.far = 100
	orthographic.up.set(0, 0, 1)
	orthographic.zoom = 200
</script>

{#if mode === 'perspective'}
	<T
		is={perspective}
		makeDefault
		{...rest}
	>
		{@render children?.()}
	</T>
{:else if mode === 'orthographic'}
	<T
		is={orthographic}
		makeDefault
		{...rest}
	>
		{@render children?.()}
	</T>
{/if}
