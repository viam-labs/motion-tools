<script lang="ts">
	import { useTask, useThrelte } from '@threlte/core'

	import { createLabelLayout } from './labelLayout/createLabelLayout'
	import { labels } from './labelLayout/labelStore.svelte'

	const { camera, invalidate, size } = useThrelte()

	const layout = createLabelLayout({ camera, size, invalidate, labels })

	// Wake the on-demand render loop when labels are added/removed or their text
	// changes, so the engine re-solves even while the camera is still. Reading
	// `rev` registers the reactive dependency.
	$effect(() => {
		if (labels.rev >= 0) invalidate()
	})

	useTask((delta) => {
		layout.frame(delta)
	})
</script>
