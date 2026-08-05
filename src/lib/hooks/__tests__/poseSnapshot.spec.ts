import { describe, expect, it } from 'vitest'

import { missingPoseFrameNames } from '../poseSnapshot'

describe('missingPoseFrameNames', () => {
	it('accepts an explicitly reconciled empty frame set', () => {
		expect(missingPoseFrameNames([], [])).toEqual([])
	})

	it('accepts matching frame and query names', () => {
		expect(missingPoseFrameNames(['arm', 'camera'], ['camera', 'arm'])).toEqual([])
	})

	it('detects equal-size sets containing the wrong query', () => {
		expect(missingPoseFrameNames(['arm', 'camera'], ['arm', 'base'])).toEqual(['camera'])
	})

	it('ignores stale queries outside the current frame set', () => {
		expect(missingPoseFrameNames(['arm'], ['old-part-frame', 'arm'])).toEqual([])
	})

	it('reports every missing configured frame once', () => {
		expect(missingPoseFrameNames(['arm', 'camera', 'arm'], ['base'])).toEqual(['arm', 'camera'])
	})
})
