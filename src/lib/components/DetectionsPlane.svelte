<script lang="ts">
	import { T } from '@threlte/core'
	import { Detection } from '@viamrobotics/sdk'

	export let detections: Detection[] = [
		{
			xMin: BigInt(1),
			xMax: BigInt(2),
			yMin: BigInt(0),
			yMax: BigInt(2),
			confidence: 0.5,
			className: '',
		},
	]
</script>

<T.Group>
	{#each detections as det}
		<T.Mesh
			scale={[Number(det.xMax - det.xMin), Number(det.yMax - det.yMin), 1]}
			position={[Number(det.xMin), Number(det.yMin), 0]}
		>
			<T.PlaneGeometry />
		</T.Mesh>
	{/each}
</T.Group>
