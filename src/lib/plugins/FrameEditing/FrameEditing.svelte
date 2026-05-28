<script lang="ts">
	import type { Struct } from '@viamrobotics/sdk'

	import FrameTransformControls from './SelectedTransformControls.svelte'
	import { provideConfigFrames } from './useConfigFrames.svelte'
	import { provideFrameEditSession } from './useFrameEditSession.svelte'
	import { provideFramelessComponents } from './useFramelessComponents.svelte'
	import { type FragmentInfo, providePartConfig } from './usePartConfig.svelte'
	import { Portal } from '@threlte/extras'

	interface Props {
		partID: string
		current: Struct
		isDirty: boolean
		componentNameToFragmentInfo: Record<string, FragmentInfo>
		setLocalPartConfig: (config: Struct) => void
	}

	let { partID, current, isDirty, componentNameToFragmentInfo, setLocalPartConfig }: Props =
		$props()

	provideFrameEditSession(() => partID)
	provideFramelessComponents()
	provideConfigFrames()

	providePartConfig(
		() => partID,
		() => ({ current, isDirty, componentNameToFragmentInfo, setLocalPartConfig })
	)
</script>

<FrameTransformControls />

<Portal id="details">
	{#if showEditFrameOptions}
		<Button
			variant="danger"
			class="mt-2 w-full"
			onclick={() => detailConfigUpdater.deleteFrame(entity)}
		>
			Delete frame
		</Button>
	{/if}
</Portal>
