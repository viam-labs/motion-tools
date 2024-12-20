<script lang="ts">
	import { T } from '@threlte/core'
	import { Detection } from '@viamrobotics/sdk'

	export let detections: Detection[] = [
		{
			xMin: BigInt(0),
			xMax: BigInt(1),
			yMin: BigInt(0),
			yMax: BigInt(1),
			confidence: 0.5,
			className: '',
		},
	]
</script>

<T.Group>
	{#each detections as det}
		<T.Mesh scale={[Number(det.xMax - det.xMin), Number(det.yMax - det.yMin), 1]}>
			<T.PlaneGeometry />
		</T.Mesh>
	{/each}
</T.Group>
