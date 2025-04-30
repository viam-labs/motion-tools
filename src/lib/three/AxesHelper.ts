import { Mesh, Vector3, Color, BoxGeometry, BufferAttribute, MeshBasicMaterial } from 'three'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'

export class AxesHelper extends Mesh {
	constructor(size = 0.1, thickness = 0.005) {
		const axisGeometries = []

		const axes = [
			{ dir: new Vector3(1, 0, 0), color: new Color(0xff0000) }, // X - Red
			{ dir: new Vector3(0, 1, 0), color: new Color(0x00ff00) }, // Y - Green
			{ dir: new Vector3(0, 0, 1), color: new Color(0x0000ff) }, // Z - Blue
		]

		const dimensions = new Vector3()

		for (const axis of axes) {
			dimensions.set(
				axis.dir.x ? size : thickness,
				axis.dir.y ? size : thickness,
				axis.dir.z ? size : thickness
			)

			const geometry = new BoxGeometry(dimensions.x, dimensions.y, dimensions.z)

			// Translate so it starts at the origin (like traditional AxesHelper)
			geometry.translate(dimensions.x / 2, dimensions.y / 2, dimensions.z / 2)

			// Add vertex colors
			const { count } = geometry.attributes.position
			const colorArray = new Float32Array(count * 3)
			for (let i = 0; i < count; i++) {
				colorArray[i * 3 + 0] = axis.color.r
				colorArray[i * 3 + 1] = axis.color.g
				colorArray[i * 3 + 2] = axis.color.b
			}
			geometry.setAttribute('color', new BufferAttribute(colorArray, 3))

			axisGeometries.push(geometry)
		}

		const mergedGeometry = mergeGeometries(axisGeometries)
		const material = new MeshBasicMaterial({ vertexColors: true })

		super(mergedGeometry, material)
	}

	dispose() {
		this.geometry.dispose()
	}
}
