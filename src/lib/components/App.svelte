<script lang="ts">
	import { Canvas } from '@threlte/core'
	import Scene from './Scene.svelte'
	import { provideRobotClientsContext, useRobotClient } from '$lib/modules/client'
	import { getDialConfs, loadRobots } from '$lib/modules/robots'
	import { derived, writable } from 'svelte/store'
	import { createPartIDContext } from '$lib/hooks/usePartID'
	import { createResourcesContext } from '$lib/hooks/useResources'

	const robots = loadRobots()
	const connectParts = provideRobotClientsContext()

	connectParts(getDialConfs(robots))

	const part = writable(Object.keys(robots).at(1))

	const partID = createPartIDContext('')
	$: partID.set(robots[$part]?.partId ?? '')

	const { client } = useRobotClient(partID)

	const resources = createResourcesContext()
	$: void $client?.resourceNames().then((unsortedResources) => {
		resources.set(unsortedResources)
	})
</script>

<Canvas>
	<Scene />
</Canvas>
