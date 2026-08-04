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

describe('meshContentType', () => {
	// RDK writes a bare `ply`/`stl`, but the field is a free string that a URDF or an HTTP fetch
	// also writes into, so the noisy spellings have to land on the same answer.
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

	it('accepts a base64 string as well as bytes', () => {
		expect(parseMeshInput(btoa(asciiStl), 'stl').getAttribute('position').count).toBe(3)
	})

	// A view into a larger buffer must not hand the loader its neighbours.
	it('parses an stl mesh held in a subarray', () => {
		const padded = new Uint8Array(bytes(asciiStl).length + 8)
		padded.set(bytes(asciiStl), 4)
		const view = padded.subarray(4, 4 + bytes(asciiStl).length)

		expect(parseMeshInput(view, 'stl').getAttribute('position').count).toBe(3)
	})
})
