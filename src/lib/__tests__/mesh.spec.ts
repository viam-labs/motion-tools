import { describe, expect, it } from 'vitest'

import { meshContentType, parseMeshInput } from '$lib/mesh'

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
 * Binary on purpose: `STLLoader` classifies ASCII by regex, so an ASCII fixture parses out of an
 * oversized buffer and the subarray and short-input cases below pass with their guards deleted.
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

// Mapped rather than spread: a spread passes one argument per byte and blows the call stack on a
// fixture of any size.
const base64 = (data: Uint8Array) =>
	btoa(Array.from(data, (byte) => String.fromCharCode(byte)).join(''))

describe('meshContentType', () => {
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

	it.each([[undefined], [''], ['obj']])('falls back to ply for a content type of %s', (raw) => {
		const geometry = parseMeshInput(bytes(asciiPly), raw)
		expect(geometry.getAttribute('position').count).toBe(3)
	})

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

	it('parses a binary stl mesh held in a subarray', () => {
		const stl = binaryStl()
		const padded = new Uint8Array(stl.length + 8)
		padded.set(stl, 4)
		const view = padded.subarray(4, 4 + stl.length)

		expect(parseMeshInput(view, 'stl').getAttribute('position').count).toBe(3)
	})

	it.each([[1], [19], [83]])(
		'returns an empty geometry for a %i byte stl rather than throwing',
		(length) => {
			expect(parseMeshInput(new Uint8Array(length), 'stl').getAttribute('position')).toBeUndefined()
		}
	)

	// Above the 84-byte guard, so the count at offset 80 is read and believed.
	it.each([
		['claims 100 triangles and carries none', 84, 100],
		['claims 2 triangles and carries 1', 84 + 50, 2],
	])(
		'returns an empty geometry for a binary stl that %s rather than throwing',
		(_label, length, claimed) => {
			const truncated = new Uint8Array(length)
			new DataView(truncated.buffer).setUint32(80, claimed, true)

			expect(parseMeshInput(truncated, 'stl').getAttribute('position')).toBeUndefined()
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
