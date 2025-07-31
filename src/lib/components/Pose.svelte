<script lang="ts">
	import { T } from '@threlte/core'
	import { usePose } from '$lib/hooks/usePose.svelte'
	import type { Pose, ResourceName } from '@viamrobotics/sdk'
	import type { Snippet } from 'svelte'
	import { Group } from 'three'
	import { poseToObject3d } from '$lib/transform'

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

	const group = new Group()

	$effect(() => {
		if (pose.current) poseToObject3d(pose.current, group)
	})
</script>

<T is={group}>
	{@render children({ pose: pose.current })}
</T>
