<script lang="ts">
	import { Canvas } from '@threlte/core'
	import Scene from './Scene.svelte'
	import { provideRobotClientsContext, useRobotClient } from '$lib/client'
	import { getDialConfs, loadRobots } from '$lib/robots'
	import { writable } from 'svelte/store'
	import { createPartIDContext } from '$lib/hooks/usePartID'
	import { createResourcesContext } from '$lib/hooks/useResources'
	import { Debug, World } from '@threlte/rapier'

	const robots = loadRobots()
	const connectParts = provideRobotClientsContext()

	connectParts(getDialConfs(robots))

	const part = writable(Object.keys(robots).at(0))

	const partID = createPartIDContext('')
	$effect(() => {
		console.log(robots, $part)
		partID.set(robots[$part]?.partId ?? '')
	})

	let { client } = $derived(useRobotClient($partID))

	const resources = createResourcesContext()
	$effect(() => {
		$client?.resourceNames().then((unsortedResources) => {
			resources.set(unsortedResources)
		})
	})
</script>

<Canvas>
	<World>
		<Debug />
		<Scene />
	</World>
</Canvas>
