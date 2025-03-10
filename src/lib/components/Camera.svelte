<script lang="ts">
	import { PersistedState } from 'runed'
	import { T } from '@threlte/core'
	import { PerspectiveCamera, OrthographicCamera } from 'three'

	let { children, ...rest } = $props()

	const mode = new PersistedState<'perspective' | 'orthographic'>('camera-type', 'perspective')
	const perspective = new PerspectiveCamera()
	const orthographic = new OrthographicCamera()
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
		near={0.01}
		makeDefault
		up={[0, 0, 1]}
		{...rest}
	>
		{@render children?.()}
	</T>
{:else if mode.current === 'orthographic'}
	<T
		is={orthographic}
		near={-100}
		far={100}
		makeDefault
		up={[0, 0, 1]}
		zoom={200}
		{...rest}
	>
		{@render children?.()}
	</T>
{/if}
