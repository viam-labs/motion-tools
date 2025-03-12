import { getContext, setContext } from 'svelte'
import type { Frame } from './useFrames.svelte'
import { get, set } from 'idb-keyval'
import { Debounced } from 'runed'

const key = Symbol('static-geometries-context')

interface Context {
	current: Frame[]
	add: () => void
	remove: (name: string) => void
}

export const provideStaticGeometries = () => {
	let staticGeometries = $state<Frame[]>([])
	const debounced = new Debounced(() => staticGeometries, 500)

	get('static-geometries').then((response) => {
		staticGeometries = response ?? []
	})

	$effect(() => {
		set('static-geometries', $state.snapshot(debounced.current))
	})

	setContext<Context>(key, {
		get current() {
			return staticGeometries
		},
		add() {
			staticGeometries.push({
				name: `geometry ${staticGeometries.length}`,
				parent: 'world',
				pose: {
					x: 0,
					y: 0,
					z: 0,
					oX: 0,
					oY: 0,
					oZ: 1,
					theta: 0,
				},
				geometry: {
					label: '',
					geometryType: {
						case: 'box',
						value: { dimsMm: { x: 100, y: 100, z: 100 } },
					},
				},
			})
		},
		remove(name: string) {
			const index = staticGeometries.findIndex((geo) => geo.name === name)
			staticGeometries.splice(index, 1)
		},
	})
}

export const useStaticGeometries = () => {
	return getContext<Context>(key)
}
