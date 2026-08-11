import '@testing-library/jest-dom/vitest'
import { fireEvent, render, screen } from '@testing-library/svelte'
import userEvent from '@testing-library/user-event'
import { flushSync } from 'svelte'
import { afterEach, describe, expect, it, vi } from 'vitest'

import type { TrajectoryPlayer } from '$lib/motion/trajectoryPlayer.svelte'

import TrajectoryScrubber from '../TrajectoryScrubber.svelte'
import ScrubberHarness from './__fixtures__/ScrubberHarness.svelte'

/**
 * Deliberately inert: these tests are about what the component reads off a player and what it calls
 * back, so the player is a fixed readout and a set of spies. Anything that needs the player to
 * actually respond uses `ScrubberHarness` instead.
 */
const stubPlayer = (overrides: Partial<TrajectoryPlayer> = {}): TrajectoryPlayer => ({
	currentStep: 0,
	totalSteps: 4,
	lastStep: 3,
	isPlaying: false,
	atEnd: false,
	play: vi.fn(),
	pause: vi.fn(),
	toggle: vi.fn(),
	seek: vi.fn(),
	stepBy: vi.fn(),
	reset: vi.fn(),
	...overrides,
})

/** An 11-frame trajectory whose waypoints land on the first, middle and last frame. */
const ELEVEN_FRAMES = { totalSteps: 11, lastStep: 10 }
const WAYPOINTS = [0, 5, 10]

const tickFractions = (container: HTMLElement): number[] =>
	[...container.querySelectorAll<HTMLElement>('[data-testid="waypoint-tick"]')].map((tick) =>
		Number(tick.style.getPropertyValue('--tick-fraction'))
	)

afterEach(() => {
	vi.useRealTimers()
})

describe('TrajectoryScrubber', () => {
	describe('transport', () => {
		it('drives the player it is given', async () => {
			const player = stubPlayer()
			render(TrajectoryScrubber, { player })

			await userEvent.click(screen.getByRole('button', { name: 'Next trajectory step' }))

			expect(player.stepBy).toHaveBeenCalledWith(1)
		})

		it('walks backwards from the previous button', async () => {
			const player = stubPlayer({ currentStep: 2 })
			render(TrajectoryScrubber, { player })

			await userEvent.click(screen.getByRole('button', { name: 'Previous trajectory step' }))

			expect(player.stepBy).toHaveBeenCalledWith(-1)
		})

		// The last *index*, not the step count: off by one here parks the scrubber one frame past the
		// end of the plan, which a real player would clamp away and hide.
		it('jumps to the last index rather than the step count', async () => {
			const player = stubPlayer()
			render(TrajectoryScrubber, { player })

			await userEvent.click(screen.getByRole('button', { name: 'Jump to end of trajectory' }))

			expect(player.seek).toHaveBeenCalledWith(3)
		})

		it('jumps to the first index from the start button', async () => {
			const player = stubPlayer({ currentStep: 2 })
			render(TrajectoryScrubber, { player })

			await userEvent.click(screen.getByRole('button', { name: 'Jump to start of trajectory' }))

			expect(player.seek).toHaveBeenCalledWith(0)
		})

		it('seeks to wherever the track is dragged', async () => {
			const player = stubPlayer(ELEVEN_FRAMES)
			render(TrajectoryScrubber, { player })

			const slider = screen.getByRole<HTMLInputElement>('slider')
			slider.value = '7'
			await fireEvent.input(slider)

			expect(player.seek).toHaveBeenCalledWith(7)
		})

		/**
		 * A player that refuses the frame leaves `currentStep` where it was, and Svelte writes `value`
		 * back only when the bound expression changes, so nothing would move the thumb off the index it
		 * was dragged to: the track would say 8 while the counter and the scene both said 1. A stub
		 * player stands in for the refusal, since it is a `seek` that does not move the index.
		 */
		it('puts the thumb back when the player does not take the frame it was dragged to', async () => {
			render(TrajectoryScrubber, { player: stubPlayer(ELEVEN_FRAMES) })

			const slider = screen.getByRole<HTMLInputElement>('slider')
			slider.value = '7'
			await fireEvent.input(slider)

			expect(slider.value).toBe('0')
		})

		/**
		 * The stub above can only prove a drag *calls* `seek` — its `currentStep` never moves, so the
		 * write-back line (`input.value = String(player.currentStep)`) is exercised only on a refusal.
		 * A stub cannot distinguish "refused" from "accepted but not yet committed", so a real player is
		 * the only way to prove a successful drag actually lands and stays where it was dropped.
		 */
		it('leaves the thumb where a successful drag left it', async () => {
			render(ScrubberHarness, {
				totalSteps: 11,
				intervalMs: 10,
				showing: true,
				onReady: () => {},
			})

			const slider = screen.getByRole<HTMLInputElement>('slider')
			slider.value = '7'
			await fireEvent.input(slider)

			expect(slider.value).toBe('7')
		})

		it('counts steps from one, the way the frames are numbered on screen', () => {
			render(TrajectoryScrubber, {
				player: stubPlayer({ currentStep: 2, totalSteps: 12, lastStep: 11 }),
			})

			expect(screen.getByText('3 / 12')).toBeInTheDocument()
		})

		it.each([
			[false, 'Play trajectory', 'Play'],
			[true, 'Pause trajectory', 'Pause'],
		])('offers %s as the %s control', (isPlaying, name, title) => {
			render(TrajectoryScrubber, { player: stubPlayer({ isPlaying }) })

			expect(screen.getByRole('button', { name })).toHaveAttribute('title', title)
		})

		it('renders nothing to drive when there are no steps', () => {
			render(TrajectoryScrubber, { player: stubPlayer({ totalSteps: 0, lastStep: 0 }) })

			expect(screen.queryByRole('button', { name: 'Next trajectory step' })).not.toBeInTheDocument()
		})

		it('names every control after the label it is given', () => {
			render(TrajectoryScrubber, { player: stubPlayer(), label: 'left arm preview' })

			expect(screen.getByRole('slider', { name: 'left arm preview step' })).toBeInTheDocument()
			expect(screen.getByRole('button', { name: 'Next left arm preview step' })).toBeInTheDocument()
		})
	})

	/**
	 * `aria-disabled` rather than `disabled`, so a keyboard user mid-scrub does not have the control
	 * vanish from under the focus ring when playback reaches an end. That leaves the click live, so
	 * the handler has to refuse it too.
	 */
	describe('the ends of a trajectory', () => {
		it.each(['Jump to start of trajectory', 'Previous trajectory step'])(
			'marks %s unavailable at the first step, without dropping it from the tab order',
			(name) => {
				render(TrajectoryScrubber, { player: stubPlayer({ currentStep: 0 }) })

				const button = screen.getByRole('button', { name })
				expect(button).toHaveAttribute('aria-disabled', 'true')
				expect(button).not.toBeDisabled()
			}
		)

		it.each(['Jump to end of trajectory', 'Next trajectory step'])(
			'marks %s unavailable at the last step',
			(name) => {
				render(TrajectoryScrubber, {
					player: stubPlayer({ currentStep: 3, atEnd: true }),
				})

				expect(screen.getByRole('button', { name })).toHaveAttribute('aria-disabled', 'true')
			}
		)

		it('leaves the forward controls available part-way through', () => {
			render(TrajectoryScrubber, { player: stubPlayer({ currentStep: 1 }) })

			expect(screen.getByRole('button', { name: 'Next trajectory step' })).toHaveAttribute(
				'aria-disabled',
				'false'
			)
		})

		it.each([
			['Previous trajectory step', 'stepBy'],
			['Jump to start of trajectory', 'seek'],
		] as const)('ignores a click on %s once it is unavailable', async (name, method) => {
			const player = stubPlayer({ currentStep: 0 })
			render(TrajectoryScrubber, { player })

			await userEvent.click(screen.getByRole('button', { name }))

			expect(player[method]).not.toHaveBeenCalled()
		})
	})

	describe('waypoint marks', () => {
		it('places one mark per waypoint, spaced by where it falls in the trajectory', () => {
			const { container } = render(TrajectoryScrubber, {
				player: stubPlayer(ELEVEN_FRAMES),
				markers: WAYPOINTS,
			})

			// Fractions of the span between the first and last *frame*, not of the frame count: the
			// last waypoint is the last frame, so it belongs hard against the end of the track.
			expect(tickFractions(container)).toEqual([0, 0.5, 1])
		})

		/**
		 * The marks sit over a range input whose thumb centre travels from half a thumb in to half a
		 * thumb short of the end. Placed at a bare percentage they miss by up to half a thumb at the
		 * ends, which is exactly where someone looks to see whether the thumb is on a mark.
		 */
		it('lines a mark up with the thumb centre for the frame it marks', () => {
			const { container } = render(TrajectoryScrubber, {
				player: stubPlayer(ELEVEN_FRAMES),
				markers: WAYPOINTS,
			})

			const lefts = [
				...container.querySelectorAll<HTMLElement>('[data-testid="waypoint-tick"]'),
			].map((tick) => globalThis.getComputedStyle(tick).left)

			// The browser's own reduction of the `.tick` formula, which is why it reads so plainly: half
			// a thumb in at the first frame, dead centre at the middle one, half a thumb short of the end
			// at the last. Drop the correction and these become a bare 0% / 50% / 100%.
			expect(lefts).toEqual(['calc(0% + 6px)', '50%', 'calc(100% - 6px)'])
		})

		it.each([
			[0, 1],
			[4, 1],
			[5, 2],
			[9, 2],
			[10, 3],
		])('reads frame %i as waypoint %i of 3', (currentStep, index) => {
			render(TrajectoryScrubber, {
				player: stubPlayer({ ...ELEVEN_FRAMES, currentStep }),
				markers: WAYPOINTS,
			})

			expect(screen.getByText(`· waypoint ${index} / 3`)).toBeInTheDocument()
		})

		// The whole point of the marks is to separate real data from frames drawn between it. When
		// every frame is a waypoint they separate nothing, and the counter says one thing twice.
		it('drops the marks and the counter when every frame is a waypoint', () => {
			const { container } = render(TrajectoryScrubber, {
				player: stubPlayer({ currentStep: 1, totalSteps: 3, lastStep: 2 }),
				markers: [0, 1, 2],
			})

			expect(tickFractions(container)).toEqual([])
			expect(screen.queryByText(/waypoint/)).not.toBeInTheDocument()
			expect(screen.getByText('2 / 3')).toBeInTheDocument()
		})

		it('shows neither when no markers are given', () => {
			const { container } = render(TrajectoryScrubber, { player: stubPlayer(ELEVEN_FRAMES) })

			expect(tickFractions(container)).toEqual([])
			expect(screen.queryByText(/waypoint/)).not.toBeInTheDocument()
		})
	})

	/**
	 * The player is built outside this component and outlives it: the replayer builds one at its
	 * plugin root, above both the monitor-mode gate and the panel's own `{#if isOpen}`. Nothing else
	 * would stop the timer, so closing the panel mid-playback would leave it reconciling the world
	 * every frame with no control on screen to stop it.
	 */
	describe('when it goes away', () => {
		it('stops the timer rather than merely asking the player to pause', async () => {
			vi.useFakeTimers()
			let player!: TrajectoryPlayer
			let steps!: number[]

			const { rerender } = render(ScrubberHarness, {
				totalSteps: 50,
				intervalMs: 10,
				showing: true,
				onReady: (p: TrajectoryPlayer, s: number[]) => {
					player = p
					steps = s
				},
			})

			player.play()
			flushSync()
			vi.advanceTimersByTime(30)
			const drawnBeforeClosing = steps.length
			expect(drawnBeforeClosing).toBeGreaterThan(0)

			await rerender({ showing: false })
			flushSync()

			vi.advanceTimersByTime(200)

			expect(steps).toHaveLength(drawnBeforeClosing)
			expect(player.isPlaying).toBe(false)
		})
	})
})
