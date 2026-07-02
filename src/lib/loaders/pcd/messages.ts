export interface SuccessMessage {
	id: number
	positions: Float32Array<ArrayBufferLike>
	colors: Uint8Array<ArrayBufferLike> | undefined
}

export interface LODLevel {
	level: number
	distance: number
	positions: Float32Array<ArrayBufferLike>
	colors: Uint8Array<ArrayBufferLike> | undefined
}

export interface LODProgressMessage {
	id: number
	lod: LODLevel
	done: boolean
	boundingBoxDiagonal: number
}

export type Message =
	| SuccessMessage
	| LODProgressMessage
	| {
			id: number
			error: string
	  }
