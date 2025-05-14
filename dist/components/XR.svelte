<script lang="ts">
	import { useXR, XR } from '@threlte/xr'
	import OriginMarker from './xr/OriginMarker.svelte'
	import { useThrelte } from '@threlte/core'

	const { renderer } = useThrelte()
	const { isPresenting } = useXR()

	$effect.pre(() => {
		if ($isPresenting) {
			const [left, right] = renderer.xr.getCamera().cameras

			console.log(left, right)
		}
	})
</script>

<XR>
	<OriginMarker />
</XR>
