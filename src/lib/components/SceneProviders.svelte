<script lang="ts">
	import { provideFrames } from '$lib/hooks/useFrames.svelte'
	import { provideGeometries } from '$lib/hooks/useGeometries.svelte'
	import { providePointclouds } from '$lib/hooks/usePointclouds.svelte'
	import { usePartID } from '$lib/hooks/usePartID.svelte'
	import { provideSelection } from '$lib/hooks/useSelection.svelte'
	import { provideStaticGeometries } from '$lib/hooks/useStaticGeometries.svelte'
	import { provideVisibility } from '$lib/hooks/useVisibility.svelte'
	import { provideDrawAPI } from '$lib/hooks/useDrawAPI.svelte'
	import { provideMachineSettings } from '$lib/hooks/useMachineSettings.svelte'
	import { provideTransformControls } from '$lib/hooks/useControls.svelte'
	import type { Snippet } from 'svelte'
	import { provideObjects } from '$lib/hooks/useObjects.svelte'
	import { provideMotionClient } from '$lib/hooks/useMotionClient.svelte'
	import { provideLogs } from '$lib/hooks/useLogs.svelte'
	import { provideSettings } from '$lib/hooks/useSettings.svelte'
	import { provideOrigin } from './xr/useOrigin.svelte'

	interface Props {
		children: Snippet<[{ focus: boolean }]>
	}

	let { children }: Props = $props()

	const partID = usePartID()

	provideSettings()
	provideTransformControls()
	provideVisibility()
	provideMachineSettings()
	provideLogs()

	provideOrigin()
	provideStaticGeometries()
	provideDrawAPI()

	provideFrames(() => partID.current)
	provideGeometries(() => partID.current)
	providePointclouds(() => partID.current)
	provideMotionClient(() => partID.current)
	provideObjects()
	const { focus } = provideSelection()
</script>

{@render children({ focus: focus.current !== undefined })}
