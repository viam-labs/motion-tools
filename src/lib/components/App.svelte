<script lang="ts">
	import { Canvas } from '@threlte/core'
	import Scene from './Scene.svelte'
	import { provideRobotClientsContext, useRobotClient } from '$lib/modules/client'
	import { getDialConfs, loadRobots } from '$lib/modules/robots'
	import { derived, writable } from 'svelte/store'
	import { createPartIDContext } from '$lib/hooks/usePartID'

	const robots = loadRobots()
	const connectParts = provideRobotClientsContext()

	connectParts(getDialConfs(robots))

	const part = writable(Object.keys(robots).at(0))

	const partID = createPartIDContext('')
	$: partID.set(robots[$part]?.partId ?? '')

	const { client } = useRobotClient(partID)

	const resources = derived(
		client,
		($client, set) => {
			void $client?.resourceNames().then((unsortedResources) => {
				set(unsortedResources)
			})
		},
		[]
	)

	$: console.log($resources)
</script>

<Canvas>
	<Scene />
</Canvas>
