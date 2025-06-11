<script lang="ts">
	import { T } from '@threlte/core'
	import { useXR, XR, XRButton } from '@threlte/xr'
	import OriginMarker from './OriginMarker.svelte'
	import DomPortal from '../DomPortal.svelte'
	import { useSettings } from '$lib/hooks/useSettings.svelte'
	import Controllers from './Controllers.svelte'

	const { isPresenting } = useXR()
	const settings = useSettings()
	const enableXR = $derived(settings.current.enableXR)
</script>

{#if enableXR}
	<XR>
		<T.Group rotation.x={$isPresenting ? -Math.PI / 2 : 0}>
			<OriginMarker />
		</T.Group>

		<Controllers />
	</XR>

	<DomPortal>
		<XRButton mode="immersive-ar" />
	</DomPortal>
{/if}
