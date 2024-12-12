<script lang="ts">
	import { T } from '@threlte/core'
	import { Float, OrbitControls } from '@threlte/extras'
	import { XR } from '@threlte/xr'
	import CameraFeed from './CameraFeed.svelte'
	import Controllers from './Controllers.svelte'
	import Hands from './Hands.svelte'
	import { useResources } from '$lib/hooks/useResources'
	import OriginMarker from './OriginMarker.svelte'

	const resources = useResources()
	const camResource = $derived($resources.filter((r) => r.subtype === 'camera')[0])

	$effect(() => console.log($resources))
</script>

<XR>
	<CameraFeed resourceName={camResource?.name} />
	<Controllers />
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
