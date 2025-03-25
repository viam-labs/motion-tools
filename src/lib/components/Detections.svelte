<script lang="ts">
	import { VisionClient } from '@viamrobotics/sdk'
	import { readable } from 'svelte/store'
	import DetectionsPlane from './DetectionsPlane.svelte'
	import { useResourceNames } from '@viamrobotics/svelte-sdk'
	import { usePartID } from '$lib/hooks/usePartID.svelte'

	const partID = usePartID()
	const cameras = useResourceNames(() => partID.current, 'camera')
	const visionServices = useResourceNames(() => partID.current, 'vision')

	// let entity = $derived(
	// 	visResource
	// 		? createResourceEntity<VisionClient>(partID, visResource.name, VisionClient)
	// 		: undefined
	// )

	// the below will need to be reformatted to call DetectionsFromCamera
	// let detectionsFromCam = $derived(
	// 	entity
	// 		? createResourceQuery(
	// 				readable({ refetchInterval: 1000 }),
	// 				entity,
	// 				'captureAllFromCamera',
	// 				readable([
	// 					camResource.name,
	// 					// "realsense",
	// 					{
	// 						returnImage: true,
	// 						returnClassifications: true,
	// 						returnDetections: true,
	// 						returnObjectPointClouds: false,
	// 					},
	// 				] as const)
	// 			)
	// 		: undefined
	// )

	// $effect(() =>
	// 	console.log('detectionsFromCam.data?.detections: ', $detectionsFromCam?.data?.detections)
	// )
	// $effect(() => console.log('detectionsFromCam.err: ', $detectionsFromCam?.error))

	// let detections = $derived($detectionsFromCam?.data?.detections ?? [])
</script>

<DetectionsPlane {detections} />
