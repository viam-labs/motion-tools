<script lang="ts">
	import { T } from '@threlte/core'
</script>

<T.Group>
	<T.Mesh
		rotation.x={Math.PI}
		position={[0, 0.05, 0]}
	>
		<T.ConeGeometry args={[0.05, 0.1]} />
		<T.MeshStandardMaterial color="red" />
	</T.Mesh>
</T.Group>
