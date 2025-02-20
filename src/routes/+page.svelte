<script>
	import { Canvas } from '@threlte/core'
	import Tree from '$lib/components/Tree.svelte'
	import Scene from './Scene.svelte'
</script>

<Canvas renderMode="always">
	<Scene />
</Canvas>

<Tree />
