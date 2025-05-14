<script lang="ts">
	import { PersistedState } from 'runed'
	import { T } from '@threlte/core'
	import { PerspectiveCamera, OrthographicCamera } from 'three'

	let { children, ...rest } = $props()

	const mode = new PersistedState<'perspective' | 'orthographic'>('camera-type', 'perspective')

	const perspective = new PerspectiveCamera()
	perspective.near = 0.01
	perspective.up.set(0, 0, 1)

	const orthographic = new OrthographicCamera()
	orthographic.near = -100
	orthographic.far = 100
	orthographic.up.set(0, 0, 1)
	orthographic.zoom = 200
</script>

<svelte:window
	onkeydown={({ key }) => {
		if (key.toLowerCase() === 'c') {
			mode.current = mode.current === 'perspective' ? 'orthographic' : 'perspective'
		}
	}}
/>

{#if mode.current === 'perspective'}
	<T
		is={perspective}
		makeDefault
		{...rest}
	>
		{@render children?.()}
	</T>
{:else if mode.current === 'orthographic'}
	<T
		is={orthographic}
		makeDefault
		{...rest}
	>
		{@render children?.()}
	</T>
{/if}
