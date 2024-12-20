<script lang='ts'>
	import { useResources } from '$lib/hooks/useResources'
	import { usePartID } from '$lib/hooks/usePartID'
	import { createResourceEntity } from '$lib/client'
	import { VisionClient } from '@viamrobotics/sdk'
    import { createResourceQuery } from '../api';
	import { readable } from 'svelte/store'

    const partID = usePartID()
	const resources = useResources()
	
	console.log("All resources: ", $resources)
	
	// Log each resource's details
	$resources.forEach(r => {
		console.log('Resource:', {
			name: r.name,
			type: r.type,
			subtype: r.subtype
		})
	})

    const camResource = $derived($resources.filter((r) => r.subtype === 'camera')[0])
	const visResource = $derived($resources.filter((r) => r.subtype === 'vision')[0])

	let entity = $derived(createResourceEntity<VisionClient>(
  		$partID,
  		visResource.name, 
        VisionClient
	))
    $effect(() => console.log("entity: ", $entity))
    $effect(() => console.log("camResource: ", camResource))

    // the below will need to be reformatted to call DetectionsFromCamera
    let detectionsFromCam = $derived(
        createResourceQuery(
            readable({ refetchInterval: 1000 }),
            entity, 
            // 'getDetectionsFromCamera',
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
    )
    $effect(() => console.log("detectionsFromCam.data?.detections: ", $detectionsFromCam.data?.detections))
    $effect(() => console.log("detectionsFromCam.err: ", $detectionsFromCam.error))
    

</script>