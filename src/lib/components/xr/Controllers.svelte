<script lang="ts">
	import { Controller } from '@threlte/xr'
	import { useGamepad } from '@threlte/extras'

	import { BaseClient } from '@viamrobotics/sdk'

	import { useRobotClient, usePartID, useResources } from '$lib/svelte-sdk'
	import { RigidBody } from '@threlte/rapier'
	import HandCollider from './HandCollider.svelte'

	const gamepadLeft = useGamepad({ xr: true, hand: 'left' })

	const partID = usePartID()
	const resources = useResources()
	const robot = useRobotClient(partID)
	const resource = $derived(resources.current.find((r) => r.subtype === 'base'))
	const baseClient = $derived(
		robot.client && resource ? new BaseClient(robot.client, resource.name) : undefined
	)

	const linear = { x: 0, y: 0, z: 0 }
	const angular = { x: 0, y: 0, z: 0 }

	// gamepadLeft.squeeze.on('change', (event) => {
	// 	linear.y = -event.value
	// 	baseClient?.setPower(linear, angular)
	// })

	// gamepadLeft.trigger.on('change', (event) => {
	// 	if (typeof event.value === 'number') {
	// 		linear.y = event.value
	// 		baseClient?.setPower(linear, angular)
	// 	}
	// })

	// gamepadLeft.thumbstick.on('change', (event) => {
	// 	if (typeof event.value === 'object') {
	// 		angular.z = event.value.x
	// 		baseClient?.setPower(linear, angular)
	// 	}
	// })

	const onselectstart = () => {}

	const onselectend = () => {}
</script>

<Controller
	left
	{onselectstart}
	{onselectend}
>
	{#snippet grip()}
		<RigidBody type="kinematicPosition">
			<HandCollider />
		</RigidBody>
	{/snippet}
</Controller>

<Controller
	right
	{onselectstart}
	{onselectend}
>
	{#snippet grip()}
		<RigidBody type="kinematicPosition">
			<HandCollider />
		</RigidBody>
	{/snippet}
</Controller>
