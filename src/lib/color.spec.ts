import { describe, expect, it } from 'vitest'

import { subtypeColorFromName, subtypeToColor } from './color'

const hex = (name: string) => subtypeColorFromName(name)?.getHexString()
const subtypeHex = (subtype: string) => subtypeToColor(subtype)?.getHexString()

describe('subtypeColorFromName', () => {
	it('maps component names to their subtype color, like the live scene', () => {
		expect(hex('left-arm')).toBe(subtypeHex('arm'))
		expect(hex('right-arm')).toBe(subtypeHex('arm'))
		expect(hex('scoop-gripper')).toBe(subtypeHex('gripper'))
		expect(hex('left-gripper')).toBe(subtypeHex('gripper'))
	})

	it('recognizes the short `cam` spelling as a camera', () => {
		expect(hex('left-cam')).toBe(subtypeHex('camera'))
		expect(hex('cam-merged-cup')).toBe(subtypeHex('camera'))
		expect(hex('cam-left-cup-crop')).toBe(subtypeHex('camera'))
	})

	it('resolves from the leading component segment of a sub-frame name', () => {
		expect(hex('left-arm:upper_arm')).toBe(subtypeHex('arm'))
		expect(hex('left-gripper:finger_link')).toBe(subtypeHex('gripper'))
	})

	it('treats obstacles as untyped even when a subtype token follows', () => {
		expect(subtypeColorFromName('obstacle-arm-left-cord')).toBeUndefined()
		expect(subtypeColorFromName('obstacle-table')).toBeUndefined()
		expect(subtypeColorFromName('bound-top')).toBeUndefined()
	})

	it('returns undefined for names with no recognized subtype token', () => {
		expect(subtypeColorFromName('table')).toBeUndefined()
		expect(subtypeColorFromName('fridge')).toBeUndefined()
		expect(subtypeColorFromName('world')).toBeUndefined()
	})
})
