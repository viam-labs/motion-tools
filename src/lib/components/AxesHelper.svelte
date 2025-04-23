<script lang="ts">
	import { Color } from 'three'
	import { T, type Props as ThrelteProps } from '@threlte/core'
	import { Line2 } from 'three/examples/jsm/lines/Line2.js'
	import { LineGeometry } from 'three/examples/jsm/lines/LineGeometry.js'
	import { LineMaterial } from 'three/examples/jsm/lines/LineMaterial.js'

	interface Props extends ThrelteProps<Line2> {
		length?: number
		width?: number
		axesColors?: [x: string, y: string, z: string]
		depthTest?: boolean
		[key: string]: any
	}

	let {
		length = 1,
		width = 1,
		axesColors = ['red', 'green', 'blue'],
		depthTest = true,
		children,
		...rest
	}: Props = $props()

	const TOTAL_VERTICES = 9
	const VERTEX_COMPONENTS = 3

	const line = new Line2()
	const material = new LineMaterial()
	const geometry = new LineGeometry()
	const color = new Color()
	const colors = new Float32Array(TOTAL_VERTICES * VERTEX_COMPONENTS)
	const positions = new Float32Array(TOTAL_VERTICES * VERTEX_COMPONENTS)

	$effect.pre(() => {
		material.linewidth = width
	})

	// Assign colors per vertex
	$effect.pre(() => {
		for (const [index, axis] of axesColors.entries()) {
			color.set(axis)

			const axisBufferStart = index * TOTAL_VERTICES
			const axisBufferEnd = axisBufferStart + TOTAL_VERTICES

			for (let j = axisBufferStart; j < axisBufferEnd; j += VERTEX_COMPONENTS) {
				colors[j + 0] = color.r
				colors[j + 1] = color.g
				colors[j + 2] = color.b
			}
		}

		geometry.setColors(colors)
	})

	const X_AXIS_X_COMPONENT_INDEX = 3
	const Y_AXIS_Y_COMPONENT_INDEX = 13
	const Z_AXIS_Z_COMPONENT_INDEX = 23

	$effect.pre(() => {
		positions[X_AXIS_X_COMPONENT_INDEX] = length
		positions[Y_AXIS_Y_COMPONENT_INDEX] = length
		positions[Z_AXIS_Z_COMPONENT_INDEX] = length

		geometry.setPositions(positions)
	})
</script>

<T
	is={line}
	{...rest}
>
	<T is={geometry} />
	<T
		is={material}
		vertexColors
		{depthTest}
	/>
	{@render children?.({ ref: line })}
</T>
