import { getContext, setContext } from 'svelte'
import { get, set } from 'idb-keyval'
import { Debounced } from 'runed'
import { createGeometry, createPose } from '$lib/transform'
import { BoxGeometry, Mesh } from 'three'
import { ObjectLoader } from 'three'

const key = Symbol('static-geometries-context')

interface Context {
	current: Mesh[]
	add: () => void
	remove: (name: string) => void
}

export const provideStaticGeometries = () => {
	const loader = new ObjectLoader()

	let staticGeometries = $state<Mesh[]>([])

	const debounced = new Debounced(() => staticGeometries, 500)

	get('static-geometries').then((response) => {
		if (Array.isArray(response)) {
			const meshes = response.map((json) => loader.parse(json))
			staticGeometries = meshes as Mesh[]
		}
	})

	$effect(() => {
		const jsons = debounced.current.map((mesh) => mesh.toJSON())
		set('static-geometries', jsons)
	})

	setContext<Context>(key, {
		get current() {
			return staticGeometries
		},
		add() {
			const geometry = new BoxGeometry()
			const mesh = new Mesh(geometry)
			mesh.name = `static geometry ${staticGeometries.length + 1}`
			mesh.userData.pose = createPose()
			mesh.userData.geometry = createGeometry({
				case: 'box',
				value: { dimsMm: { x: 100, y: 100, z: 100 } },
			})
			staticGeometries.push(mesh)
		},
		remove(name: string) {
			const index = staticGeometries.findIndex((geo) => geo.name === name)
			staticGeometries.splice(index, 1)
		},
	})
}

export const useStaticGeometries = (): Context => {
	return getContext<Context>(key)
}
