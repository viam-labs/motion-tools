import type { Entity } from 'koota'
import type { Group } from 'three'

import { isInstanceOf } from '@threlte/core'
import { ArmClient } from '@viamrobotics/sdk'
import { createResourceClient, useResourceNames } from '@viamrobotics/svelte-sdk'
import { getContext, setContext } from 'svelte'
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'

import { traits, useWorld } from '$lib/ecs'

import { useSettings } from './useSettings.svelte'

const gltfLoader = new GLTFLoader()
const dracoLoader = new DRACOLoader()
dracoLoader.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.6/')
gltfLoader.setDRACOLoader(dracoLoader)

const key = Symbol('3d-models-context')

interface Context {
	current: Record<string, Record<string, Group>>
}

type Models = Record<string, Record<string, Group>>

/**
 * Resolves the loaded 3D model for a geometry entity's `Name`, formatted
 * `"<componentName>:<id>"`. Returns undefined when the name is malformed or no
 * model has been fetched for it. Shared by `GeometryModel` (to render the
 * model) and the `ColliderHidden` sync below (to hide the collider it replaces)
 * so the two decisions can never drift apart.
 */
export const matchModel = (name: string | undefined, models: Models): Group | undefined => {
	if (!name) return undefined
	const [componentName, id] = name.split(':')
	if (!componentName || !id) return undefined
	return models[componentName]?.[id]
}

const syncColliderHidden = (entity: Entity, models: Models, hideColliders: boolean) => {
	const shouldHide = hideColliders && matchModel(entity.get(traits.Name), models) !== undefined
	if (shouldHide === entity.has(traits.ColliderHidden)) return
	if (shouldHide) {
		entity.add(traits.ColliderHidden)
	} else {
		entity.remove(traits.ColliderHidden)
	}
}

export const provide3DModels = (partID: () => string) => {
	const settings = useSettings()
	const world = useWorld()
	let current = $state.raw<Record<string, Record<string, Group>>>({})

	const arms = useResourceNames(partID, 'arm')
	const armClients = $derived(
		arms.current.map((arm) => createResourceClient(ArmClient, partID, () => arm.name))
	)
	const clients = $derived(
		armClients.filter((client) => {
			return arms.current.some((arm) => arm.name === client.current?.name)
		})
	)

	const fetch3DModels = async () => {
		const next: Record<string, Record<string, Group>> = {}
		for (const client of clients) {
			if (!client.current) continue
			try {
				const geometries = await client.current.getGeometries()
				if (geometries.length === 0) {
					continue
				}
				const geometryLabel = geometries[0].label
				const prefix = geometryLabel.split(':')[0]
				const models = await client.current.get3DModels()
				if (!(prefix in next)) {
					next[prefix] = {}
				}
				for (const [id, model] of Object.entries(models)) {
					const arrayBuffer = model.mesh.buffer.slice(
						model.mesh.byteOffset,
						model.mesh.byteOffset + model.mesh.byteLength
					)
					const gltfModel = await gltfLoader.parseAsync(arrayBuffer as ArrayBuffer, '')
					next[prefix][id] = gltfModel.scene

					gltfModel.scene.traverse((object) => {
						if (isInstanceOf(object, 'Mesh')) {
							const { material } = object

							if (isInstanceOf(material, 'MeshStandardMaterial')) {
								material.roughness = 0.3
								material.metalness = 0.1
							}
						}
					})
				}
			} catch (error) {
				// some arms may not implement this api yet
				console.warn(`${client.current.name} returned an error: ${error} when getting 3D models`)
			}
		}
		current = next
	}

	$effect(() => {
		const shouldFetchModels =
			settings.isLoaded && settings.current.renderArmModels.includes('model')

		if (shouldFetchModels) {
			fetch3DModels()
		}
	})

	/**
	 * Colliders are hidden only in the `'model'`-only mode — `'colliders+model'`
	 * intentionally shows both. Reacts to `current` (models finishing loading)
	 * and the setting; the `onAdd` listener covers geometry entities that stream
	 * in while neither has changed.
	 */
	$effect(() => {
		const models = current
		const hideColliders = settings.current.renderArmModels === 'model'

		for (const entity of world.query(traits.GeometriesAPI)) {
			syncColliderHidden(entity, models, hideColliders)
		}

		return world.onAdd(traits.GeometriesAPI, (entity) => {
			syncColliderHidden(entity, models, hideColliders)
		})
	})

	setContext<Context>(key, {
		get current() {
			return current
		},
	})
}

export const use3DModels = () => {
	return getContext<Context>(key)
}
