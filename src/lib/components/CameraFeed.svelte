<script lang="ts">
	import { T, useTask } from '@threlte/core'
	import BentPlaneGeometry from './BentPlaneGeometry.svelte'
	import { useHeadset } from '@threlte/xr'
	import { Euler, Group, Vector3, Quaternion, type Mesh } from 'three'
	import { StreamClient } from '@viamrobotics/sdk'
	import { useRobotClient } from '$lib/modules/client'
	import { usePartID } from '$lib/hooks/usePartID'

	const partID = usePartID()
	const robot = useRobotClient(partID)
	const robotClient = robot.client

	let video = document.createElement('video')
	let aspect = $state(1)
	let ready = $state(false)

	let streamClient = $derived($robotClient ? new StreamClient($robotClient) : undefined)

	video.addEventListener('canplaythrough', () => {
		aspect = video?.videoWidth / video?.videoHeight
		video.play()
	})

	const handleTrack = (event: unknown) => {
		const [eventStream] = (event as { streams: MediaStream[] }).streams

		if (!eventStream || eventStream.id !== 'camera-1') {
			return
		}

		console.log(eventStream)
		video.srcObject = eventStream

		ready = true
	}

	$effect(() => {
		streamClient?.on('track', handleTrack)
		return () => streamClient?.off('track', handleTrack)
	})

	$effect(() => {
		streamClient?.getStream('camera-1')

		return () => {
			streamClient?.remove('camera-1')
		}
	})

	const headset = useHeadset()

	let group: Group
	let mesh: Mesh

	let euler = new Euler()
	let quaternion = new Quaternion()
	let direction = new Vector3()

	const { start, stop } = useTask(
		() => {
			group.position.lerp(headset.position, 0.025)

			headset.getWorldDirection(direction)
			euler.set(0, Math.atan2(direction.x, direction.z), 0)
			quaternion.setFromEuler(euler)
			group.quaternion.slerp(quaternion, 0.025)

			mesh.material.map.update()

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
</script>

{#if ready}
	<T.Group bind:ref={group}>
		<T.Mesh
			bind:ref={mesh}
			position={[0, 0, -2]}
		>
			<BentPlaneGeometry args={[0.1, aspect, 1, 20, 20]} />
			<T.MeshStandardMaterial>
				<T.VideoTexture
					attach="map"
					args={[video]}
				/>
			</T.MeshStandardMaterial>
		</T.Mesh>
	</T.Group>
{/if}
