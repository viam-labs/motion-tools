<script lang="ts">
	import { usePose } from '$lib/hooks/usePose.svelte'
	import type { Pose, ResourceName } from '@viamrobotics/sdk'
	import type { Snippet } from 'svelte'

	interface Props {
		resourceName: ResourceName
		parent?: string
		children: Snippet<[{ pose: Pose | undefined }]>
	}
	let { resourceName, parent = 'world', children }: Props = $props()

	const pose = usePose(
		() => resourceName,
		() => parent
	)
</script>

{@render children({ pose: pose.current })}
