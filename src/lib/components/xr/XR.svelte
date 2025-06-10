<script lang="ts">
	import { XR, XRButton } from '@threlte/xr'
	import OriginMarker from './OriginMarker.svelte'
	import DomPortal from '../DomPortal.svelte'
	import { useSettings } from '$lib/hooks/useSettings.svelte'

	const settings = useSettings()
	const enableXR = $derived(settings.current.enableXR)
</script>

{#if enableXR}
	<XR>
		<OriginMarker />
	</XR>

	<DomPortal>
		<XRButton mode="immersive-ar" />
	</DomPortal>
{/if}
