<script>
	import { XRButton } from '@threlte/xr'
	import { Canvas } from '@threlte/core'
	import { Debug, World } from '@threlte/rapier'
	import { PersistedState } from 'runed'

	let { children } = $props()

	const showPhysicsDebug = new PersistedState('physics-debug', false)
</script>

<svelte:window
	onkeydown={({ key }) => {
		if (key.toLowerCase() === 'p') {
			showPhysicsDebug.current = !showPhysicsDebug.current
		}
	}}
/>

<XRButton
	mode="immersive-ar"
	sessionInit={{ optionalFeatures: ['depth-sensing'] }}
/>

<Canvas>
	<World>
		{#if showPhysicsDebug.current}
			<Debug />
		{/if}
		{@render children()}
	</World>
</Canvas>
