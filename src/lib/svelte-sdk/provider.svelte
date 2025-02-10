<script lang="ts">
	import type { Snippet } from 'svelte'
	import { createResourcesContext } from './hooks/useResources.svelte'
	import { createPartIDContext } from './hooks/usePartID.svelte'
	import { getDialConfs, loadRobots } from './robots'
	import { provideRobotClientsContext, useRobotClient } from './client'

	interface Props {
		children: Snippet
	}

	let { children }: Props = $props()

	const robots = loadRobots()
	const connectParts = provideRobotClientsContext()

	connectParts(getDialConfs(robots))

	const part = $derived(Object.keys(robots).at(0))

	const resources = createResourcesContext()
	const partID = createPartIDContext()

	let { client } = $derived(useRobotClient(partID.current))

	$effect.pre(() => {
		const id = robots[part ?? '']?.partId
		if (id) {
			partID.set(id)
		}
	})

	$effect.pre(() => {
		$client?.resourceNames().then((unsortedResources) => {
			resources.set(unsortedResources)
		})
	})
</script>

{@render children()}
