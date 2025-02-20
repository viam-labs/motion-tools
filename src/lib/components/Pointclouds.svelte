<script lang="ts">
	import { Points } from 'three'
	import { PCDLoader } from 'three/addons/loaders/PCDLoader.js'
	import { T } from '@threlte/core'

	import { useFrames } from '$lib/hooks/useFrames.svelte'
	import { useResources, useRobot } from '$lib/svelte-sdk'
	import { CameraClient } from '@viamrobotics/sdk'

	const loader = new PCDLoader()
	const robot = useRobot()
	const cameras = useResources('camera')
	const cameraClients = $derived(
		cameras.current.map((camera) => new CameraClient(robot.client!, camera.name))
	)

	const pcds = $state<Points[]>([])

	$effect(() => {
		for (const cameraClient of cameraClients) {
			cameraClient.getPointCloud().then(async (data) => {
				const transformed = await robot.client?.transformPCD(data, cameraClient.name, 'world')

				if (transformed) {
					const uint8array = new Uint8Array(transformed)
					pcds.push(loader.parse(uint8array.buffer))
				}
			})
		}
	})
</script>

{#each pcds as points (points.uuid)}
	<T is={points} />
{/each}
