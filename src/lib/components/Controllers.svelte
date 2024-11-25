<script lang="ts">
	import { Controller } from '@threlte/xr'
	import { useGamepad } from '@threlte/extras'
	import { useQueryClient } from '@tanstack/svelte-query'

	import { BaseClient, InputControllerClient, type InputControllerEvent } from '@viamrobotics/sdk'

	import { createResourceMutation, createResourceQueryKey } from '$lib/api'
	import { createResourceEntity, useRobotClient } from '$lib/client'
	import { usePartID } from '$lib/hooks/usePartID'
	import { useResources } from '$lib/hooks/useResources'

	const gamepadLeft = useGamepad({ xr: true, hand: 'left' })
	// const gamepadRight = useGamepad({ xr: true, hand: 'right' })
	// const gamepad = useGamepad()

	// gamepadRight.on('change', triggerEvent)

	const partID = usePartID()
	const resources = useResources()
	const { client } = useRobotClient($partID)
	const resource = $derived($resources.find((r) => r.subtype === 'base'))
	const baseClient = $derived(
		$client && resource ? new BaseClient($client, resource.name) : undefined
	)

	const linear = { x: 0, y: 0, z: 0 }
	const angular = { x: 0, y: 0, z: 0 }

	gamepadLeft.squeeze.on('change', (event) => {
		linear.y = -event.value
		baseClient?.setPower(linear, angular)
	})
	gamepadLeft.trigger.on('change', (event) => {
		linear.y = event.value
		baseClient?.setPower(linear, angular)
	})
	gamepadLeft.thumbstick.on('change', (event) => {
		angular.z = event.value.x
		baseClient?.setPower(linear, angular)
	})
</script>

<Controller left>
	{#snippet children()}{/snippet}
</Controller>

<Controller right>
	{#snippet children()}{/snippet}
</Controller>
