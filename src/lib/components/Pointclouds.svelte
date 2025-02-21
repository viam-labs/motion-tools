<script lang="ts">
	import { Points } from 'three'
	import { PCDLoader } from 'three/addons/loaders/PCDLoader.js'
	import { T } from '@threlte/core'
	import { createQuery } from '@tanstack/svelte-query'

	import { useResources, useRobot } from '$lib/svelte-sdk'
	import { CameraClient } from '@viamrobotics/sdk'

	const loader = new PCDLoader()
	const robot = useRobot()
	const cameras = useResources('camera')
	const clients = $derived(
		cameras.current.map((camera) => new CameraClient(robot.client!, camera.name))
	)

	const query = $derived.by(() => {
		clients
		return createQuery({
			queryKey: ['pointclouds'],
			refetchInterval: 10_000,
			queryFn: async () => {
				const responses = await Promise.all(clients.map((client) => client.getPointCloud()))
				const transformed = await Promise.all(
					responses.map((response, index) =>
						robot.client?.transformPCD(response, clients[index].name, 'world')
					)
				)
				return transformed
					.filter((value) => value !== undefined)
					.map((value) => loader.parse(new Uint8Array(value).buffer))
			},
		})
	})

	let pcds = $state<Points[]>([])
	let error = $state<Error>()
	let loading = $state(false)

	$effect.pre(() => {
		return query.subscribe(($query) => {
			error = $query.error ?? undefined
			loading = $query.isLoading
			pcds = $query.data ?? []
		})
	})
</script>

{#each pcds as points (points.uuid)}
	<T is={points} />
{/each}
