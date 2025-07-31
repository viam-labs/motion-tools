import { createResourceClient, createResourceQuery } from '@viamrobotics/svelte-sdk'
// import { useLogs } from './useLogs.svelte'
import { useMachineSettings } from './useMachineSettings.svelte'
import {
	ArmClient,
	BaseClient,
	CameraClient,
	GripperClient,
	GantryClient,
	type ResourceName,
} from '@viamrobotics/sdk'
import { WorldObject } from '../WorldObject'
import { resourceColors } from '$lib/color'

export const useResourceGeometries = (partID: () => string, resourceName: () => ResourceName) => {
	// const logs = useLogs()
	const { refreshRates } = useMachineSettings()

	const options = $derived({
		enabled: refreshRates.get('Geometries') !== -1,
		refetchInterval: refreshRates.get('Geometries') ?? 1000,
	})

	const query = (() => {
		const { subtype, name } = resourceName()

		if (subtype === 'arm') {
			const client = createResourceClient(ArmClient, partID, () => name)
			return createResourceQuery(client, 'getGeometries', () => options)
		} else if (subtype === 'base') {
			const client = createResourceClient(BaseClient, partID, () => name)
			return createResourceQuery(client, 'getGeometries', () => options)
		} else if (subtype === 'camera') {
			const client = createResourceClient(CameraClient, partID, () => name)
			return createResourceQuery(client, 'getGeometries', () => options)
		} else if (subtype === 'gantry') {
			const client = createResourceClient(GantryClient, partID, () => name)
			return createResourceQuery(client, 'getGeometries')
		} else if (subtype === 'gripper') {
			const client = createResourceClient(GripperClient, partID, () => name)
			return createResourceQuery(client, 'getGeometries', () => options)
		}
	})()

	const geometry = $derived.by(() => {
		const resource = resourceName()
		const geometries = query?.current.data
		const results: WorldObject[] = []

		if (!geometries) return results

		for (const geometry of geometries) {
			results.push(
				new WorldObject(geometry.label, geometry.center, resource.name, geometry.geometryType, {
					color: resourceColors[resource.subtype as keyof typeof resourceColors],
				})
			)
		}

		return results
	})

	return {
		get current() {
			return geometry
		},
	}
}
