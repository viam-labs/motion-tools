<script lang="ts">
	import { Points } from 'three'
	import { PCDLoader } from 'three/addons/loaders/PCDLoader.js'
	import { T } from '@threlte/core'

	import { useFrames } from '$lib/hooks/useFrames.svelte'
	import { useResources, useRobot } from '$lib/svelte-sdk'
	import { CameraClient } from '@viamrobotics/sdk'

	const loader = new PCDLoader()
	const robot = useRobot()
	const client = $derived(robot.current?.client)
	const cameras = useResources('camera')
	const cameraClients = $derived(
		cameras.current.map((camera) => new CameraClient($client!, camera.name))
	)

	const pcds = $state<Points[]>([])
	const frames = useFrames()

	$effect(() => {
		for (const cameraClient of cameraClients) {
			cameraClient.getPointCloud().then(async (data) => {
				const transformed = await $client?.transformPCD(data, cameraClient.name, 'world')

				if (transformed) {
					const uint8array = new Uint8Array(transformed)
					pcds.push(loader.parse(uint8array.buffer))
				}
			})
		}
	})

	$inspect(frames.current)
</script>

{#each pcds as points (points.uuid)}
	<T is={points} />
{/each}
