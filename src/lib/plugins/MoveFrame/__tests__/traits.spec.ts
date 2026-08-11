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

	/**
	 * Known limitation, not a regression: `_origin` is stripped before the colon split ever runs, on
	 * the premise that `_origin` is only ever appended to a whole part name by
	 * `frameSystemToPlanFrames`. Nothing enforces that premise — a URDF may legally name a link
	 * `wrist_origin` — so a link with that literal name mis-parses. Pinned here rather than "fixed" so
	 * a future change to this function has to notice it is changing this answer on purpose. See the
	 * docstring on `previewComponentName` for why colon-first isn't a fix either.
	 */
	it('mis-parses a link literally named `<link>_origin` as part of the known limitation', () => {
		expect(previewComponentName('arm:wrist_origin')).toBe('arm:wrist')
	})
})
