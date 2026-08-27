<script lang="ts">
	import { useCameraControls } from '$lib/hooks/useControls.svelte'

	const controls = useCameraControls()

	$effect(() => {
		if (!controls.current) return

		const currentControls = controls.current

		if ('minPolarAngle' in currentControls) {
			const { minPolarAngle, maxPolarAngle } = currentControls

			currentControls.polarAngle = 0
			currentControls.minPolarAngle = 0
			currentControls.maxPolarAngle = 0

			return () => {
				currentControls.minPolarAngle = minPolarAngle
				currentControls.maxPolarAngle = maxPolarAngle
			}
		}
	})
</script>
