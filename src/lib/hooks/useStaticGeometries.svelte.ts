import { getContext, setContext } from 'svelte'
import { get, set } from 'idb-keyval'
import { Debounced } from 'runed'
import { createGeometry, createPose } from '$lib/transform'
import { BoxGeometry, Mesh } from 'three'
import { ObjectLoader } from 'three'
import { WorldObject } from '$lib/WorldObject'

const key = Symbol('static-geometries-context')

interface Context {
	current: WorldObject[]
	add: () => void
	remove: (name: string) => void
}

export const provideStaticGeometries = () => {
	const loader = new ObjectLoader()

	let geometries = $state<WorldObject[]>([])

	const debounced = new Debounced(() => geometries, 500)

	get('static-geometries').then((response) => {
		if (Array.isArray(response)) {
			geometries = response as WorldObject[]
		}
	})

	$effect(() => {
		set('static-geometries', $state.snapshot(debounced.current))
	})

	setContext<Context>(key, {
		get current() {
			return geometries
		},
		add() {
			const object = new WorldObject(
				`custom geometry ${geometries.length + 1}`,
				undefined,
				undefined,
				createGeometry({
					case: 'box',
					value: { dimsMm: { x: 100, y: 100, z: 100 } },
				}).geometryType
			)

			geometries.push(object)
		},
		remove(name: string) {
			const index = geometries.findIndex((geo) => geo.name === name)
			geometries.splice(index, 1)
		},
	})
}

export const useStaticGeometries = (): Context => {
	return getContext<Context>(key)
}
