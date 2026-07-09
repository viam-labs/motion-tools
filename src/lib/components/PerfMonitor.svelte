<script lang="ts">
	import { useStage, useTask, useThrelte } from '@threlte/core'
	import { ThreePerf } from 'three-perf'

	interface Props {
		logsPerSecond?: number
		showGraph?: boolean
		memory?: boolean
		enabled?: boolean
		visible?: boolean
		backgroundOpacity?: number
		scale?: number
		anchorX?: 'left' | 'right'
		anchorY?: 'top' | 'bottom'
	}

	let {
		logsPerSecond = 10,
		showGraph = true,
		memory = true,
		enabled = true,
		visible = true,
		backgroundOpacity = 0.7,
		scale = 1,
		anchorX = 'left',
		anchorY = 'top',
	}: Props = $props()

	const { dom, renderer, renderStage, mainStage } = useThrelte()

	let perf: ThreePerf

	$effect.pre(() => {
		perf = new ThreePerf({
			domElement: dom,
			renderer,
		})

		// three-perf hardcodes `position: fixed`, which anchors the monitor to
		// the viewport even when the visualizer is embedded in a larger page.
		// Anchor it to Threlte's relative-positioned canvas wrapper instead.
		perf.ui.wrapper.style.position = 'absolute'

		// Overlay panels (Details, FloatingPanel) share this corner at z-4/z-5;
		// keep the debug monitor above them so toggling it on is never a no-op,
		// but below the top-layer fullscreen/file-drop overlays.
		perf.ui.wrapper.style.zIndex = '10'

		return () => perf.dispose()
	})

	$effect.pre(() => {
		perf.logsPerSecond = logsPerSecond
		perf.showGraph = showGraph
		perf.memory = memory
		perf.enabled = enabled
		perf.visible = visible
		perf.backgroundOpacity = backgroundOpacity
		perf.scale = scale
		perf.anchorX = anchorX
		perf.anchorY = anchorY
	})

	useTask(
		() => {
			perf.begin()
		},
		{
			stage: useStage('monitor-begin', {
				before: mainStage,
			}),
		}
	)

	useTask(
		() => {
			perf.end()
		},
		{
			stage: useStage('monitor-end', {
				after: renderStage,
			}),
		}
	)
</script>
