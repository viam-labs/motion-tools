export const writeLinePosition = (
	source: Float32Array,
	index: number,
	x: number,
	y: number,
	z: number
): Float32Array => {
	const next = new Float32Array(source)
	next[index * 3 + 0] = x
	next[index * 3 + 1] = y
	next[index * 3 + 2] = z
	return next
}

export const appendLinePosition = (source: Float32Array): Float32Array => {
	const next = new Float32Array(source.length + 3)
	next.set(source)
	const lastIndex = source.length - 3
	if (lastIndex >= 0) {
		next[source.length + 0] = source[lastIndex]! + 0.1
		next[source.length + 1] = source[lastIndex + 1]!
		next[source.length + 2] = source[lastIndex + 2]!
	}

	return next
}

export const removeLinePosition = (source: Float32Array, index: number): Float32Array => {
	if (source.length <= 6) return source

	const next = new Float32Array(source.length - 3)
	next.set(source.subarray(0, index * 3), 0)
	next.set(source.subarray((index + 1) * 3), index * 3)
	return next
}
