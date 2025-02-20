<script>
	import { Canvas } from '@threlte/core'
	import Scene from './Scene.svelte'
	import TreeContainer from '$lib/components/TreeContainer.svelte'
</script>

<Canvas renderMode="always">
	<Scene />
</Canvas>

<TreeContainer />
