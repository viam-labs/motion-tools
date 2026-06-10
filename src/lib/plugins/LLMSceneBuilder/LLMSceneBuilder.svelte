<script lang="ts">
	import SceneBuilder from './SceneBuilder.svelte'
	import { type InferCallback, provideSceneBuilder } from './useSceneBuilder.svelte'

	interface Props {
		onInfer: InferCallback
	}

	const { onInfer }: Props = $props()

	provideSceneBuilder((prompt, components) => onInfer(prompt, components))
</script>

<SceneBuilder />
