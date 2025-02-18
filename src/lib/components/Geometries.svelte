<script lang="ts">
	import { useRobot } from '$lib/svelte-sdk'
	import { Geometry } from '@viamrobotics/sdk'

	const robot = useRobot()

	let client = $derived(robot.current?.client)
	let geometries = $state<Geometry[]>([])

	$effect.pre(() => {
		$client?.armService.getGeometries({}).then((value) => {
			geometries = value.geometries
		})
	})
</script>
