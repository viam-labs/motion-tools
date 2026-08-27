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
				// rdk namespaces a model's frames as `<component>:<id>`, so the prefix
				// is the component's own name.
				const prefix = client.current.name
				const models = await client.current.get3DModels()
				if (Object.keys(models).length === 0) {
					continue
				}
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
							// Set on the loaded model rather than each clone: `GeometryModel`
							// clones per frame, and `clone()` carries these flags across.
							object.castShadow = true
							object.receiveShadow = true

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
	 * and the setting; the `onAdd` listener covers frames that stream in while
	 * neither has changed.
	 *
	 * A collider named `<component>:<id>` is a kinematics link frame — the
	 * geometry that used to arrive from `getGeometries` now comes from the frame
	 * system, so `FramesAPI` is the only owner left.
	 */
	$effect(() => {
		const models = current
		const hideColliders = settings.current.renderArmModels === 'model'

		for (const entity of world.query(traits.FramesAPI)) {
			syncColliderHidden(entity, models, hideColliders)
		}

		return world.onAdd(traits.FramesAPI, (entity) => {
			syncColliderHidden(entity, models, hideColliders)
		})
	})

	/**
	 * A model whose key matches no frame renders nothing, and silently: it is the
	 * same outcome as an arm that ships no models at all. The two are worth
	 * telling apart, because a mismatch means the model keys and the kinematics
	 * link ids have drifted — `get3DModels` keys by bare link id, and frames are
	 * named `<component>:<id>` from the same ids.
	 */
	$effect(() => {
		const loaded = Object.entries(current).flatMap(([component, parts]) =>
			Object.keys(parts).map((id) => `${component}:${id}`)
		)
		if (loaded.length === 0) return

		const frameNames = new Set(
			world
				.query(traits.FramesAPI)
				.map((entity) => entity.get(traits.Name))
				.filter((name): name is string => name !== undefined)
		)
		const unmatched = loaded.filter((name) => !frameNames.has(name))
		if (unmatched.length === 0) return

		console.warn(
			`[3d-models] ${unmatched.length} of ${loaded.length} models match no frame: ${unmatched.join(', ')}`
		)
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
