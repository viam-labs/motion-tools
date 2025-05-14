<script lang="ts">
	import { provideFrames } from '../hooks/useFrames.svelte'
	import { provideGeometries } from '../hooks/useGeometries.svelte'
	import { providePointclouds } from '../hooks/usePointclouds.svelte'
	import { providePoses } from '../hooks/usePoses.svelte'
	import { usePartID } from '../hooks/usePartID.svelte'
	import { provideSelection } from '../hooks/useSelection.svelte'
	import { provideStaticGeometries } from '../hooks/useStaticGeometries.svelte'
	import { provideVisibility } from '../hooks/useVisibility.svelte'
	import { provideShapes } from '../hooks/useShapes.svelte'
	import { provideRefreshRates } from '../hooks/useRefreshRates.svelte'
	import { provideTransformControls } from '../hooks/useControls.svelte'
	import type { Snippet } from 'svelte'
	import { provideObjects } from '../hooks/useObjects.svelte'

	interface Props {
		children: Snippet<[{ focus: boolean }]>
	}

	let { children }: Props = $props()

	const partID = usePartID()

	provideTransformControls()
	provideStaticGeometries()
	provideVisibility()
	provideShapes()
	provideRefreshRates()

	provideFrames(() => partID.current)
	providePoses(() => partID.current)
	provideGeometries(() => partID.current)
	providePointclouds(() => partID.current)
	provideObjects()

	const { focus } = provideSelection()
</script>

{@render children({ focus: focus.current !== undefined })}
