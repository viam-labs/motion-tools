import { describe, expect, it } from 'vitest'

import { meshContentType, parseMeshInput } from '$lib/mesh'

/** One triangle, the smallest thing STLLoader will produce vertices for. */
const asciiStl = `solid tri
facet normal 0 0 1
  outer loop
    vertex 0 0 0
    vertex 1 0 0
    vertex 0 1 0
  endloop
endfacet
endsolid tri
`

const asciiPly = `ply
format ascii 1.0
element vertex 3
property float x
property float y
property float z
element face 1
property list uchar int vertex_index
end_header
0 0 0
1 0 0
0 1 0
3 0 1 2
`

const bytes = (text: string) => new TextEncoder().encode(text)

/**
 * A real binary STL: an 80 byte header, the triangle count as a little-endian uint32, then 50 bytes
 * per triangle (a normal and three vertices as float32, plus a 2 byte attribute count).
 *
 * The ASCII form above cannot stand in for this. `STLLoader` decides binary versus ASCII by checking
 * whether `80 + 4 + 50n` equals the buffer length, so binary is the only form that notices being
 * handed the wrong number of bytes — which is exactly what the subarray and short-input cases exist
 * to check. It is also the only form RDK produces: `newMeshFromSTLBytes` parses binary and nothing
 * else, and keeps the raw bytes it was given.
 */
const binaryStl = (triangles = 1): Uint8Array => {
	const buffer = new ArrayBuffer(84 + 50 * triangles)
	const view = new DataView(buffer)
	view.setUint32(80, triangles, true)

	let offset = 84
	for (let i = 0; i < triangles; i += 1) {
		// normal (0,0,1) then the three corners of a unit triangle
		for (const value of [0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0]) {
			view.setFloat32(offset, value, true)
			offset += 4
		}
		offset += 2
	}

	return new Uint8Array(buffer)
}

const base64 = (data: Uint8Array) => btoa(String.fromCodePoint(...data))

describe('meshContentType', () => {
	// Both RDK producers write a bare lowercase token, so everything past the first two rows is
	// defense against a field this repo does not own rather than a shape anyone has observed.
	it.each([
		['ply', 'ply'],
		['stl', 'stl'],
		['STL', 'stl'],
		['  Ply  ', 'ply'],
		['model/stl', 'stl'],
		['application/ply; charset=binary', 'ply'],
	])('reads %s as %s', (raw, expected) => {
		expect(meshContentType(raw)).toBe(expected)
	})

	it.each([['obj'], ['dae'], [''], [undefined]])('does not claim to handle %s', (raw) => {
		expect(meshContentType(raw)).toBeUndefined()
	})

	// A path is not a content type. It belongs in `mesh_file_path`, and reading an extension here
	// would commit us to reading one out of a `package://` URI too.
	it.each([['meshes/ur20/collision/base.stl'], ['package://arm/link_1.stl'], ['/etc/thing.ply']])(
		'does not read a file path like %s as a content type',
		(raw) => {
			expect(meshContentType(raw)).toBeUndefined()
		}
	)
})

describe('parseMeshInput', () => {
	it('parses an stl mesh into real vertices', () => {
		const geometry = parseMeshInput(bytes(asciiStl), 'stl')
		expect(geometry.getAttribute('position').count).toBe(3)
	})

	it('parses a ply mesh into real vertices', () => {
		const geometry = parseMeshInput(bytes(asciiPly), 'ply')
		expect(geometry.getAttribute('position').count).toBe(3)
	})

	// PLY is the fallback rather than an error: it is what every caller assumed before stl was
	// handled at all, so an unlabelled mesh has to behave exactly as it always has.
	it.each([[undefined], [''], ['obj']])('falls back to ply for a content type of %s', (raw) => {
		const geometry = parseMeshInput(bytes(asciiPly), raw)
		expect(geometry.getAttribute('position').count).toBe(3)
	})

	// RDK writes geometry with no triangles; that is not a malformed mesh.
	it.each([['ply'], ['stl']])('returns an empty geometry for empty %s bytes', (contentType) => {
		expect(parseMeshInput(new Uint8Array(), contentType).getAttribute('position')).toBeUndefined()
	})

	it('parses a binary stl mesh into real vertices', () => {
		expect(parseMeshInput(binaryStl(2), 'stl').getAttribute('position').count).toBe(6)
	})

	it.each([
		['ascii', () => btoa(asciiStl)],
		['binary', () => base64(binaryStl())],
	])('accepts a base64 %s stl as well as bytes', (_label, encode) => {
		expect(parseMeshInput(encode(), 'stl').getAttribute('position').count).toBe(3)
	})

	/**
	 * A view into a larger buffer must not hand the loader its neighbours. The fixture has to be
	 * binary for this to mean anything: an ASCII payload still parses out of an oversized buffer
	 * because `STLLoader` finds `solid` and falls back to a regex, so an ASCII version of this test
	 * passes with the guard deleted. Binary fails closed instead, and silently — the triangle count
	 * is read from the wrong offset and the loader returns zero vertices rather than throwing.
	 */
	it('parses a binary stl mesh held in a subarray', () => {
		const stl = binaryStl()
		const padded = new Uint8Array(stl.length + 8)
		padded.set(stl, 4)
		const view = padded.subarray(4, 4 + stl.length)

		expect(parseMeshInput(view, 'stl').getAttribute('position').count).toBe(3)
	})

	/**
	 * `STLLoader` reads the triangle count as a uint32 at offset 80 before it checks the length, so
	 * anything shorter throws a `RangeError` out of the `DataView`. PLY answers the same input with
	 * an empty geometry, and these run inside an unguarded loop over every geometry on a resource,
	 * so one truncated mesh throwing would cost the ones behind it.
	 */
	it.each([[1], [19], [83]])(
		'returns an empty geometry for a %i byte stl rather than throwing',
		(length) => {
			expect(parseMeshInput(new Uint8Array(length), 'stl').getAttribute('position')).toBeUndefined()
		}
	)

	it.each([
		['an empty string', ''],
		['a truncated base64 payload', btoa('solid t\nendsolid t\n')],
		['malformed base64', '!!!not base64!!!'],
	])('returns an empty geometry for %s rather than throwing', (_label, encoded) => {
		expect(parseMeshInput(encoded, 'stl').getAttribute('position')).toBeUndefined()
	})
})
