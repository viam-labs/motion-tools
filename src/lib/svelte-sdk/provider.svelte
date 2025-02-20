<script lang="ts">
	import type { Snippet } from 'svelte'
	import { createResourcesContext } from './hooks/useResources.svelte'
	import { createPartIDContext } from './hooks/usePartID.svelte'
	import { getDialConfs, loadRobots } from './robots'
	import { provideRobotClientsContext, useRobotClient } from './client'
	import { useActiveConnectionConfig } from '$lib/hooks'
	import { provideRobotContext } from './hooks/useRobot.svelte'
	import { provideFrames } from '$lib/hooks/useFrames.svelte'
	import { provideGeometries } from '$lib/hooks/useGeometries.svelte'

	interface Props {
		children: Snippet
	}

	let { children }: Props = $props()

	const connectionConfig = useActiveConnectionConfig()
	const connectParts = provideRobotClientsContext()

	const resources = createResourcesContext()
	const partID = createPartIDContext()

	provideRobotContext()
	provideFrames()
	provideGeometries()

	let robot = $derived(useRobotClient(partID))

	$effect.pre(() => {
		if (partID.current && connectionConfig.current) {
			connectParts(
				getDialConfs({
					robot: connectionConfig.current,
				})
			)
		}
	})

	$effect.pre(() => {
		const id = connectionConfig.current?.partId

		if (id) {
			partID.set(id)
		}
	})

	$effect.pre(() => {
		robot.client?.resourceNames().then((unsortedResources) => {
			resources.set(unsortedResources)
		})
	})
</script>

{@render children()}
