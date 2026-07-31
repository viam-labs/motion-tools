import type { ResourceName, Transform } from '@viamrobotics/sdk'

import { describe, expect, it } from 'vitest'

import { defaultMotionService, frameParent, motionServiceNames } from '../moveControls'

const resource = (subtype: string, type = 'service', name = `${subtype}-1`): ResourceName =>
	({ namespace: 'rdk', type, subtype, name }) as ResourceName

const frame = (referenceFrame: string, parent?: string): Transform =>
	({
		referenceFrame,
		poseInObserverFrame: parent ? { referenceFrame: parent } : undefined,
	}) as Transform

describe('motionServiceNames', () => {
	it('keeps only motion services and maps to names, in order', () => {
		expect(
			motionServiceNames([
				resource('vision', 'service', 'vision-1'),
				resource('motion', 'service', 'builtin'),
				resource('motion', 'component', 'not-a-service'),
				resource('motion', 'service', 'planner'),
			])
		).toEqual(['builtin', 'planner'])
	})

	it('is empty when the machine has no motion service', () => {
		expect(motionServiceNames([resource('arm', 'component')])).toEqual([])
	})
})

describe('defaultMotionService', () => {
	it('prefers the built-in service', () => {
		expect(defaultMotionService(['planner', 'builtin'])).toBe('builtin')
	})

	it('falls back to the first when there is no built-in', () => {
		expect(defaultMotionService(['planner', 'secondary'])).toBe('planner')
	})

	it('is empty when there are no services', () => {
		expect(defaultMotionService([])).toBe('')
	})
})

describe('frameParent', () => {
	it('returns the parent reference frame when configured', () => {
		expect(frameParent([frame('arm', 'base')], 'arm')).toBe('base')
	})

	it('falls back to world when the frame has no parent pose', () => {
		expect(frameParent([frame('arm')], 'arm')).toBe('world')
	})

	it('falls back to world when the frame is absent', () => {
		expect(frameParent([frame('base', 'world')], 'arm')).toBe('world')
	})
})
