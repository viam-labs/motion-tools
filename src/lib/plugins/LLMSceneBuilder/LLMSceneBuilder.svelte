<script lang="ts">
	import { provideSceneBuilder, type InferCallback } from './useSceneBuilder.svelte'
	import SceneBuilder from './SceneBuilder.svelte'

	interface Props {
		onInfer: InferCallback
	}

	const { onInfer }: Props = $props()

	provideSceneBuilder((prompt, components) => onInfer(prompt, components))
</script>

<SceneBuilder />
