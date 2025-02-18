<script lang="ts">
	import { BatchedMesh, BoxGeometry, Matrix4, Quaternion, Vector3 } from 'three'
	import { T } from '@threlte/core'
	import { Geometry, ArmClient } from '@viamrobotics/sdk'
	import { useResources, useRobot } from '$lib/svelte-sdk'
	import { useFrames } from '$lib/hooks/useFrames.svelte'

	const robot = useRobot()

	let client = $derived(robot.current?.client)

	const box = new BoxGeometry(1, 1, 1)
	const mesh = new BatchedMesh(900, 5_000, 5_000)
	const matrix = new Matrix4()

	const boxGeometryId = mesh.addGeometry(box)
	const boxIds: number[] = []
	const position = new Vector3()
	const quaternion = new Quaternion()
	const scale = new Vector3()

	for (let i = 0; i < 300; i += 1) {
		const id = mesh.addInstance(boxGeometryId)
		matrix.compose(position, quaternion, scale)
		mesh.setMatrixAt(id, matrix)
		boxIds.push(id)
	}

	const frames = useFrames()

	$effect(() => {
		let index = 0
		for (const frame of frames.current) {
			position.copy(frame.pose).multiplyScalar(0.001)

			if (frame.physicalObject.geometryType.case === 'box') {
				const id = boxIds[index]
				const rect = frame.physicalObject.geometryType.value

				scale.copy(rect.dimsMm!).multiplyScalar(0.001)
				matrix.compose(position, quaternion, scale)
				mesh.setMatrixAt(id, matrix)
				index += 1
			}
		}
	})

	let geometries = $state<Geometry[]>([])

	const arms = useResources('arm')
	const armClients = $derived(arms.current.map((arm) => new ArmClient($client!, arm.name)))

	// $effect.pre(() => {
	// 	$client?.armService.getGeometries({}).then((value) => {
	// 		geometries = value.geometries
	// 	})
	// })
</script>

<T is={mesh}>
	<T.MeshToonMaterial
		color="red"
		transparent
		opacity={0.7}
	/>
</T>
