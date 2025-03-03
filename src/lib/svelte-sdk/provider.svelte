<script lang="ts">
	import type { Snippet } from 'svelte'
	import { createResourcesContext } from './hooks/useResources.svelte'
	import { createPartIDContext } from './hooks/usePartID.svelte'
	import { getDialConfs } from './robots'
	import { provideRobotClientsContext, useRobotClient } from './client'
	import { useActiveConnectionConfig } from '$lib/hooks'
	import { provideRobotContext } from './hooks/useRobot.svelte'
	import { provideFrames } from '$lib/hooks/useFrames.svelte'
	import { provideGeometries } from '$lib/hooks/useGeometries.svelte'
	import { providePointclouds } from '$lib/hooks/usePointclouds.svelte'
	import { provideSelection } from '$lib/hooks/useSelection.svelte'
	import { provideStaticGeometries } from '$lib/hooks/useStaticGeometries.svelte'

	interface Props {
		children: Snippet
	}

	let { children }: Props = $props()

	const connectionConfig = useActiveConnectionConfig()
	const { connectParts } = provideRobotClientsContext()

	const partID = createPartIDContext(() => connectionConfig.current?.partId ?? '')

	useRobotClient(() => partID.current)
	provideRobotContext()
	createResourcesContext()
	provideFrames()
	provideGeometries()
	provideStaticGeometries()
	providePointclouds()
	provideSelection()

	$effect.pre(() => {
		if (partID.current && connectionConfig.current) {
			const robot = {
				...$state.snapshot(connectionConfig.current),
				disableSessions: true,
			}

			connectParts(getDialConfs({ robot }))
		}
	})
</script>

{@render children()}
