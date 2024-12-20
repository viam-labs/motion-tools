<script lang="ts">
	import { T } from '@threlte/core'
	import { Float, OrbitControls } from '@threlte/extras'
	import { XR } from '@threlte/xr'
	import CameraFeed from './CameraFeed.svelte'
	import Controllers from './Controllers.svelte'
	import Hands from './Hands.svelte'
	import { useResources } from '$lib/hooks/useResources'
	import type { Detection, VisionClient } from '@viamrobotics/sdk'
	import { onDestroy } from 'svelte'

	const resources = useResources()
	console.log("All resources: ", $resources)
	
	// Log each resource's details
	$resources.forEach(r => {
		console.log('Resource:', {
			name: r.name,
			type: r.type,
			subtype: r.subtype
		})
	})
	console.log("hello there 111")

	const camResource = $derived($resources.filter((r) => r.subtype === 'camera')[0])
	const visResource = $derived($resources.filter((r) => r.subtype === 'vision')[0]) as VisionClient

	console.log('Filtered resources:', {
		camera: camResource,
		vision: visResource
	})

	let detections: Detection[] = []
	let detectionInterval: number

	async function getDetections() {
		if (!visResource || !camResource?.name) {
			console.log('Missing resources:', { visResource, camResource })
			return
		}
		console.log('have resources!:', { visResource, camResource })
		
		try {
			const result = await (visResource as VisionClient).getDetectionsFromCamera(camResource.name)
			console.log("result: ", result)
			detections = result
			console.log('Detections:', detections)
		} catch (error) {
			console.error('Error getting detections:', error)
		}
	}

	// Call getDetections periodically or based on your needs
	detectionInterval = setInterval(getDetections, 1000) // Updates every second

	onDestroy(() => {
		if (detectionInterval) {
			clearInterval(detectionInterval)
		}
	})

	// $effect(() => console.log($resources))
</script>

<XR>
	<CameraFeed resourceName={camResource?.name} />
	<Controllers />
	<Detections />
	<Hands />

	<OriginMarker />
</XR>

<T.PerspectiveCamera
	makeDefault
	position={[-10, 10, 10]}
	fov={15}
>
	<OrbitControls
		autoRotate
		enableZoom={false}
		enableDamping
		autoRotateSpeed={0.5}
		target.y={1.5}
	/>
</T.PerspectiveCamera>

<T.DirectionalLight
	position.x={5}
	position.y={10}
/>
<T.AmbientLight />

<Float
	floatIntensity={1}
	floatingRange={[0, 1]}
>
	<T.Mesh
		position.y={1.2}
		position.z={-0.75}
		scale={0.1}
	>
		<T.BoxGeometry />
		<T.MeshStandardMaterial color="#0059BA" />
	</T.Mesh>
</Float>

<Float
	floatIntensity={1}
	floatingRange={[0, 1]}
>
	<T.Mesh
		position={[1.2, 1.5, 0.75]}
		rotation.x={5}
		rotation.y={71}
		scale={0.1}
	>
		<T.TorusKnotGeometry args={[0.5, 0.15, 100, 12, 2, 3]} />
		<T.MeshStandardMaterial color="#F85122" />
	</T.Mesh>
</Float>

<Float
	floatIntensity={1}
	floatingRange={[0, 1]}
>
	<T.Mesh
		position={[-1.4, 1.5, 0.75]}
		rotation={[-5, 128, 10]}
		scale={0.1}
	>
		<T.IcosahedronGeometry />
		<T.MeshStandardMaterial color="#F8EBCE" />
	</T.Mesh>
</Float>