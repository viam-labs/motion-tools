import { describe, expect, it } from 'vitest'

import { previewComponentName } from '../traits'

describe('previewComponentName', () => {
	it.each([
		['arm', 'arm'],
		['arm_origin', 'arm'],
		['arm:wrist_1_link', 'arm'],
		['myremote:arm_origin', 'myremote:arm'],
		['myremote:arm:wrist_1_link', 'myremote:arm'],
	])('reads %s as %s', (frameName, expected) => {
		expect(previewComponentName(frameName)).toBe(expected)
	})

	// Pinned, not endorsed: `_origin` is stripped before the colon split, so a link a URDF legally
	// names `wrist_origin` mis-parses. Changing this answer should be a deliberate act.
	it('mis-parses a link literally named `<link>_origin`', () => {
		expect(previewComponentName('arm:wrist_origin')).toBe('arm:wrist')
	})
})
