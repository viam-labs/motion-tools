import type { WorldObject } from '$lib/WorldObject'

export const usePersistentUUIDs = () => {
	const uuids = new Map<string, string>()
	const updateUUIDs = (objects: WorldObject[]) => {
		if (uuids.size === 0) {
			for (const object of objects) {
				uuids.set(object.name, object.uuid)
			}
		}
		for (const object of objects) {
			object.uuid = uuids.get(object.name) ?? object.uuid
		}
	}

	return { uuids, updateUUIDs }
}
