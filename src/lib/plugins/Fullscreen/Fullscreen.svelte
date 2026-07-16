<script lang="ts">
	import { Portal } from '@threlte/extras'

	import FullscreenButton from './FullscreenButton.svelte'
	import { useFullscreen } from './useFullscreen.svelte'

	const fullscreen = useFullscreen()

	$effect(() => {
		fullscreen.available = true

		return () => {
			fullscreen.available = false
			fullscreen.active = false
		}
	})
</script>

<Portal id="workspace">
	<FullscreenButton bind:fullscreen={fullscreen.active} />
</Portal>
