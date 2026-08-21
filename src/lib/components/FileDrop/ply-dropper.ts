import { isArrayBuffer } from 'lodash-es'
import { PLYLoader } from 'three/examples/jsm/loaders/PLYLoader.js'

import {
	type FileDropper,
	FileDropperError,
	type FileDropperParams,
	parseFailure,
} from './file-dropper'

export const plyDropper: FileDropper = async (params: FileDropperParams) => {
	const { name, content } = params
	if (!isArrayBuffer(content)) {
		return {
			success: false,
			error: new FileDropperError(`${name} failed to load.`),
		}
	}

	try {
		const geometry = new PLYLoader().parse(new TextDecoder().decode(content))
		return {
			success: true,
			name,
			type: 'ply',
			ply: geometry,
		}
	} catch (error) {
		return parseFailure(name, error)
	}
}
