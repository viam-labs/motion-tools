<script lang="ts">
	import { Canvas } from '@threlte/core'
	import Scene from './Scene.svelte'
	import { provideRobotClientsContext, useRobotClient } from '$lib/client'
	import { getDialConfs, loadRobots } from '$lib/robots'
	import { writable } from 'svelte/store'
	import { createPartIDContext } from '$lib/hooks/usePartID.svelte'
	import { createResourcesContext } from '$lib/hooks/useResources.svelte'
	import { Debug, World } from '@threlte/rapier'
	import { PersistedState } from 'runed'

	const showPhysicsDebug = new PersistedState('physics-debug', false)

	const robots = loadRobots()
	const connectParts = provideRobotClientsContext()

	connectParts(getDialConfs(robots))

	const part = writable(Object.keys(robots).at(0))

	const partID = createPartIDContext('')

	$effect.pre(() => {
		partID.current = robots[$part]?.partId ?? ''
	})

	let { client } = $derived(useRobotClient(partID.current))

	const resources = createResourcesContext()

	$effect(() => {
		$client?.resourceNames().then((unsortedResources) => {
			resources.current = unsortedResources
		})
	})
</script>

<svelte:window
	onkeydown={({ key }) => {
		if (key.toLowerCase() === 'p') {
			showPhysicsDebug.current = !showPhysicsDebug.current
		}
	}}
/>

<Canvas>
	<World>
		{#if showPhysicsDebug.current}
			<Debug />
		{/if}
		<Scene />
	</World>
</Canvas>
