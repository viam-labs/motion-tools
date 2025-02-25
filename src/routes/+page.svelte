<script lang="ts">
	import { Canvas } from '@threlte/core'
	import Scene from './Scene.svelte'
	import TreeContainer from '$lib/components/TreeContainer.svelte'
	import Logs from '$lib/components/Logs.svelte'
</script>

<Canvas renderMode="always">
	<Scene />
</Canvas>

<TreeContainer />
<Logs />
