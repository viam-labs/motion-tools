<script lang="ts">
	import { PersistedState } from 'runed'
	import { XR, XRButton } from '@threlte/xr'
	import OriginMarker from './OriginMarker.svelte'
	import DomPortal from '../DomPortal.svelte'

	const enableXR = new PersistedState('enable-xr', false)
</script>

<svelte:window
	onkeydown={(event) => {
		if (event.ctrlKey && event.key.toLowerCase() === 'a') {
			enableXR.current = !enableXR.current
		}
	}}
/>

{#if enableXR.current}
	<XR>
		<OriginMarker />
	</XR>

	<DomPortal>
		<XRButton mode="immersive-ar" />
	</DomPortal>
{/if}
