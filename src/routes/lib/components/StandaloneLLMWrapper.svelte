<script lang="ts">
	import LLMSceneBuilder from '$lib/plugins/LLMSceneBuilder/LLMSceneBuilder.svelte'

	import { provideStandaloneLLM } from '../hooks/useStandaloneLLM.svelte'

	const standaloneLLMContext = provideStandaloneLLM()
</script>

<LLMSceneBuilder onInfer={standaloneLLMContext.current} />
