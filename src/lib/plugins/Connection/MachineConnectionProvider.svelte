<script lang="ts">
	import type { DialConf } from '@viamrobotics/sdk'
	import type { Snippet } from 'svelte'

	import { provideMachineConnection } from './useMachineConnection.svelte'

	interface Props {
		partID: string | undefined
		dialConfig: DialConf | undefined
		children: Snippet
	}

	const { partID, dialConfig, children }: Props = $props()

	provideMachineConnection(
		() => partID ?? '',
		() => dialConfig
	)
</script>

{@render children()}
