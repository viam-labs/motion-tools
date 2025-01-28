<script lang="ts">
	import { useResources } from '$lib/hooks/useResources.svelte'
	import { usePartID } from '$lib/hooks/usePartID'
	import { createResourceEntity } from '$lib/client'
	import { VisionClient } from '@viamrobotics/sdk'
	import { createResourceQuery } from '../api'
	import { readable } from 'svelte/store'
	import DetectionsPlane from './DetectionsPlane.svelte'

	const partID = usePartID()
	const resources = useResources()

	// Log each resource's details
	resources.current.forEach((r) => {
		console.log('Resource:', {
			name: r.name,
			type: r.type,
			subtype: r.subtype,
		})
	})

	const camResource = $derived(resources.current.filter((r) => r.subtype === 'camera')[0])
	const visResource = $derived(resources.current.filter((r) => r.subtype === 'vision')[0])

	let entity = $derived(
		visResource
			? createResourceEntity<VisionClient>($partID, visResource.name, VisionClient)
			: undefined
	)

	// the below will need to be reformatted to call DetectionsFromCamera
	let detectionsFromCam = $derived(
		entity
			? createResourceQuery(
					readable({ refetchInterval: 1000 }),
					entity,
					'captureAllFromCamera',
					readable([
						camResource.name,
						// "realsense",
						{
							returnImage: true,
							returnClassifications: true,
							returnDetections: true,
							returnObjectPointClouds: false,
						},
					] as const)
				)
			: undefined
	)

	$effect(() =>
		console.log('detectionsFromCam.data?.detections: ', $detectionsFromCam?.data?.detections)
	)
	$effect(() => console.log('detectionsFromCam.err: ', $detectionsFromCam?.error))

	let detections = $derived($detectionsFromCam?.data?.detections ?? [])
</script>

<DetectionsPlane {detections} />
