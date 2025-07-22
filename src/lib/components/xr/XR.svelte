<script lang="ts">
	import { T } from '@threlte/core'
	import { useXR, XR, XRButton } from '@threlte/xr'
	import OriginMarker from './OriginMarker.svelte'
	import { useSettings } from '$lib/hooks/useSettings.svelte'
	import Controllers from './Controllers.svelte'
	import { domPortal } from '$lib/portal'

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

	<XRButton
		{@attach domPortal()}
		mode="immersive-ar"
	/>
{/if}
