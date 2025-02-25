<script lang="ts">
	import { Box3, Box3Helper } from 'three'
	import { T } from '@threlte/core'
	import { useSelection } from '$lib/hooks/useSelection.svelte'

	const selection = useSelection()

	let box = $state.raw(new Box3Helper(new Box3(), '#000000'))

	$effect(() => {
		const mesh = selection.current

		if (mesh) {
			// Calculate bounding box for mesh2 **only** (ignoring mesh1)
			mesh.geometry.computeBoundingBox() // Ensure the bounding box is computed
			const boundingBox = mesh.geometry.boundingBox!.clone()

			// Apply world transformations manually if needed
			boundingBox.applyMatrix4(mesh.matrixWorld)

			// Visualize the bounding box
			box = new Box3Helper(boundingBox, 0xff0000) // Red wireframe
		}
	})
</script>

{#if selection.current}
	<T is={box} />
{/if}
