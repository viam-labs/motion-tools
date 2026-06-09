<script lang="ts">
	import { provideStandaloneLLM } from '$lib/hooks/useStandaloneLLM.svelte'
	import LLMSceneBuilder from '$lib/plugins/LLMSceneBuilder/LLMSceneBuilder.svelte'

	const standaloneLLMContext = provideStandaloneLLM()
</script>

<LLMSceneBuilder onInfer={standaloneLLMContext.current} />
