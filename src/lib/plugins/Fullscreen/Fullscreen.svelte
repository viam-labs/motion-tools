<script lang="ts">
	import { Portal } from '@threlte/extras'

	import { useFullscreen } from '$lib/hooks/useFullscreen.svelte'

	import FullscreenButton from './FullscreenButton.svelte'

	const fullscreen = useFullscreen()

	$effect(() => {
		fullscreen.current.available = true

		return () => {
			fullscreen.current.available = false
			fullscreen.current.active = false
		}
	})
</script>

<Portal id="dom">
	<FullscreenButton bind:fullscreen={fullscreen.current.active} />
</Portal>
