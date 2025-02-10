<script lang="ts">
	import { T, useTask } from '@threlte/core'
	import BentPlaneGeometry from '../BentPlaneGeometry.svelte'
	import { useHeadset } from '@threlte/xr'
	import { Euler, Group, Mesh, Vector3, Quaternion, VideoTexture } from 'three'
	import { StreamClient } from '@viamrobotics/sdk'
	import { usePartID, useRobotClient } from '$lib/svelte-sdk'

	interface CameraFeedProps {
		resourceName: string
	}

	let { resourceName }: CameraFeedProps = $props()

	const partID = usePartID()
	let robot = $derived(useRobotClient(partID.current))
	let robotClient = $derived(robot.client)

	let video = document.createElement('video')
	let aspect = $state(1)
	let ready = $state(false)

	let streamClient = $derived($robotClient ? new StreamClient($robotClient) : undefined)

	video.addEventListener('canplaythrough', () => {
		aspect = video.videoWidth / video.videoHeight
		video.play()
	})

	const handleTrack = (event: unknown) => {
		const [eventStream] = (event as { streams: MediaStream[] }).streams

		if (!eventStream || eventStream.id !== resourceName) {
			return
		}
		video.srcObject = eventStream
		ready = true
	}

	$effect(() => {
		streamClient?.on('track', handleTrack)
		return () => streamClient?.off('track', handleTrack)
	})

	$effect(() => {
		streamClient?.getStream(resourceName)
		return () => streamClient?.remove(resourceName)
	})

	const headset = useHeadset()

	let group = new Group()
	let mesh = new Mesh()
	let euler = new Euler()
	let quaternion = new Quaternion()
	let direction = new Vector3()

	const { start, stop } = useTask(
		(delta) => {
			group.position.lerp(headset.position, delta * 5)

			headset.getWorldDirection(direction)
			euler.set(0, Math.atan2(direction.x, direction.z), 0)
			quaternion.setFromEuler(euler)
			group.quaternion.slerp(quaternion, delta * 5)

			mesh.lookAt(headset.position)
		},
		{ autoStart: false }
	)

	$effect(() => {
		if (ready) {
			start()
		} else {
			stop()
		}
	})

	const texture = new VideoTexture(video)
</script>

{#if ready}
	<T is={group}>
		<T.Group>
			<T
				is={mesh}
				position={[0, 0, -1.5]}
				scale={0.7}
			>
				<BentPlaneGeometry args={[0.1, aspect, 1, 20, 20]} />
				<T.MeshBasicMaterial map={texture} />
			</T>
		</T.Group>
	</T>
{/if}
