<script lang="ts">
	import type { Struct } from '@bufbuild/protobuf'

	import type { FragmentInfo } from './useFragmentInfo.svelte'

	import AddFrames from './AddFrames.svelte'
	import TransformControls from './TransformControls.svelte'
	import { provideFragmentInfo } from './useFragmentInfo.svelte'
	import { providePartConfig } from './usePartConfig.svelte'

	interface LocalConfigProps {
		current: Struct
		isDirty: boolean
		setLocalPartConfig: (config: Struct) => void
	}

	interface Props {
		partID?: string

		localConfigProps?: LocalConfigProps

		/**
		 * Maps a component name to the fragment that defines it. Embedded hosts
		 * supply this; in standalone it is computed from fragment queries (omit).
		 */
		componentNameToFragmentInfo?: Record<string, FragmentInfo>
	}

	let { componentNameToFragmentInfo, partID = '', localConfigProps }: Props = $props()

	provideFragmentInfo(
		() => partID,
		() => componentNameToFragmentInfo
	)

	providePartConfig(
		() => partID,
		() => localConfigProps
	)
</script>

<AddFrames />
<TransformControls />
