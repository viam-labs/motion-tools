<script lang="ts">
	import type { Snippet } from 'svelte'

	import { MachineConnectionEvent } from '@viamrobotics/sdk'
	import { useConnectionStatus } from '@viamrobotics/svelte-sdk'
	import { tick } from 'svelte'

	import { provideHierarchy, provideWorldMatrix } from '$lib/ecs'
	import { provide3DModels } from '$lib/hooks/use3DModels.svelte'
	import { provideArmClient } from '$lib/hooks/useArmClient.svelte'
	import { provideArmKinematics } from '$lib/hooks/useArmKinematics.svelte'
	import { provideConfigFrames } from '$lib/hooks/useConfigFrames.svelte'
	import { provideTransformControls } from '$lib/hooks/useControls.svelte'
	import { provideFramelessComponents } from '$lib/hooks/useFramelessComponents.svelte'
	import { provideFrames } from '$lib/hooks/useFrames.svelte'
	import { provideGeometries } from '$lib/hooks/useGeometries.svelte'
	import { provideInheritedInvisible } from '$lib/hooks/useInheritedInvisible.svelte'
	import { provideLinkedEntities } from '$lib/hooks/useLinked.svelte'
	import { useEnvironment } from '$lib/hooks/useEnvironment.svelte'
	import { usePartID } from '$lib/hooks/usePartID.svelte'
	import { providePointcloudObjects } from '$lib/hooks/usePointcloudObjects.svelte'
	import { providePointclouds } from '$lib/hooks/usePointclouds.svelte'
	import { providePoses } from '$lib/hooks/usePoses.svelte'
	import { useRefetchPoses } from '$lib/hooks/useRefetchPoses'
	import { provideRelationships } from '$lib/hooks/useRelationships.svelte'
	import { provideResourceByName } from '$lib/hooks/useResourceByName.svelte'
	import { provideWorldStates } from '$lib/hooks/useWorldState.svelte'

	interface Props {
		children: Snippet
	}

	let { children }: Props = $props()

	const partID = usePartID()
	const environment = useEnvironment()
	const connectionStatus = useConnectionStatus(() => partID.current)
	const { refetchPoses } = useRefetchPoses()

	provideTransformControls()

	provideHierarchy()
	provideWorldMatrix()
	provideInheritedInvisible()

	provideRelationships()

	provideResourceByName(() => partID.current)
	provideConfigFrames()
	provideFrames(() => partID.current)
	providePoses(() => partID.current)
	const geometries = provideGeometries(() => partID.current)
	provide3DModels(() => partID.current)
	providePointclouds(() => partID.current)
	providePointcloudObjects(() => partID.current)
	provideArmClient(() => partID.current)
	provideArmKinematics(() => partID.current)
	provideWorldStates()
	provideFramelessComponents()

	provideLinkedEntities()

	$effect(() => {
		if (
			!environment.buildSyncing ||
			connectionStatus.current !== MachineConnectionEvent.CONNECTED
		) {
			return
		}

		let cancelled = false
		void (async () => {
			// Let frame/resource discovery register its per-resource queries first.
			await tick()
			await Promise.allSettled([refetchPoses(), geometries.refetch()])
			// Query observers and the ECS hierarchy update in reactive effects.
			await tick()
			if (!cancelled && environment.current.mode === 'build') {
				environment.finishBuildSync()
			}
		})()

		return () => {
			cancelled = true
		}
	})
</script>

{@render children()}
