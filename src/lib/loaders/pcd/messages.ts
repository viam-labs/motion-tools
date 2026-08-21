import type { Bounds } from '../../attribute'

/** For callers with no budget to hand down, such as the draw service's clouds. */
export const DEFAULT_SHUFFLE_DEPTH = 1_000_000

export interface SuccessMessage {
	id: number
	positions: Float32Array
	colors: Uint8Array | undefined
	bounds: Bounds | undefined
	/**
	 * How many leading points came back as a uniform subsample. Travels with the data because a
	 * budget raised after the parse would otherwise decimate into the scan-ordered tail.
	 */
	shuffled: number
}

export type Message =
	| SuccessMessage
	| {
			id: number
			error: string
	  }
