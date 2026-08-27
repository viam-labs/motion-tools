import { expect } from '@playwright/test'
import { type JsonValue, Struct } from '@viamrobotics/sdk'
import { execSync } from 'node:child_process'
import path from 'node:path'
import url from 'node:url'

import { connectViamClient, getE2EConfig, withRobot } from './fixtures/with-robot'

const dirname = path.dirname(url.fileURLToPath(import.meta.url))
const moduleDir = path.resolve(dirname, '../modules/visualization')

/**
 * Drives one subtest of the module's Go e2e suite, which writes to the machine over DoCommand.
 * Each call changes exactly one thing, so the screenshot taken after it has a single cause.
 */
const draw = (testPath: string) => {
	try {
		const output = execSync(`go test -run '${testPath}' . -count=1 -v -timeout=120s 2>&1`, {
			encoding: 'utf8',
			cwd: moduleDir,
		})
		console.log(output)
	} catch (error: unknown) {
		const execError = error as { stdout?: string; stderr?: string; message?: string }
		console.error('Go test failed:', execError.stdout ?? '', execError.stderr ?? '')
		throw error
	}
}

const getModuleConfig = () => ({
	modules: [
		{
			type: 'local',
			name: 'visualization',
			executable_path: path.resolve(dirname, '.bin/visualization'),
		},
	],
	services: [
		{
			name: 'world-state-store',
			api: 'rdk:service:world_state_store',
			model: 'viam-viz:visualization:world-state-store',
			attributes: {},
		},
	],
	components: [],
})

withRobot.beforeAll(async () => {
	const config = getE2EConfig()
	const viamClient = await connectViamClient()
	await viamClient.appClient.updateRobotPart(
		config.partId,
		config.machineName,
		Struct.fromJson(getModuleConfig() as unknown as JsonValue)
	)

	// Give viam-server time to load the module and configure the service
	await new Promise((resolve) => setTimeout(resolve, 10_000))

	// Pushing an unchanged config does not restart the module, and it holds its scene in process,
	// so anything a previous run left behind would show up in the first screenshot here.
	draw('^TestVisualizationReset$')
})

withRobot.afterAll(async () => {
	const config = getE2EConfig()
	const viamClient = await connectViamClient()
	await viamClient.appClient.updateRobotPart(config.partId, config.machineName, Struct.fromJson({}))
})

/**
 * The entities sit in one row 900mm apart, each inside a ±250mm envelope, so every shape is
 * separately legible and a change to one cannot be mistaken for a change to its neighbour.
 */
withRobot('every drawing kind renders, separated', async ({ robotPage }) => {
	const { page } = robotPage

	draw('^TestVisualizationLayout$/Line')
	await expect(page.getByText('viz-line', { exact: true })).toBeVisible({ timeout: 30_000 })
	await robotPage.screenshotCanvas('VIZ-LAYOUT-0-line')

	draw('^TestVisualizationLayout$/Points')
	await expect(page.getByText('viz-points', { exact: true })).toBeVisible({ timeout: 10_000 })
	await robotPage.screenshotCanvas('VIZ-LAYOUT-1-points')

	draw('^TestVisualizationLayout$/Arrows')
	await expect(page.getByText('viz-arrows', { exact: true })).toBeVisible({ timeout: 10_000 })
	await robotPage.screenshotCanvas('VIZ-LAYOUT-2-arrows')

	draw('^TestVisualizationLayout$/Nurbs')
	await expect(page.getByText('viz-nurbs', { exact: true })).toBeVisible({ timeout: 10_000 })
	await robotPage.screenshotCanvas('VIZ-LAYOUT-3-nurbs')

	// A native Transform, to prove projected drawings and real geometry share one world.
	draw('^TestVisualizationLayout$/Box')
	await expect(page.getByText('viz-box', { exact: true })).toBeVisible({ timeout: 10_000 })
	await robotPage.screenshotCanvas('VIZ-LAYOUT-4-all-five')

	robotPage.assertScreenshots()
})

withRobot('updates change one entity at a time', async ({ robotPage }) => {
	const { page } = robotPage

	await expect(page.getByText('viz-line', { exact: true })).toBeVisible({ timeout: 30_000 })

	// The shallow V becomes a tall spike, well above everything else in the row.
	draw('^TestVisualizationUpdate$/ReshapeLine')
	await page.waitForTimeout(2000)
	await robotPage.screenshotCanvas('VIZ-UPDATE-0-line-reshaped')

	// Green to magenta: a hue jump, not a shade of the same colour.
	draw('^TestVisualizationUpdate$/RecolorPoints')
	await page.waitForTimeout(2000)
	await robotPage.screenshotCanvas('VIZ-UPDATE-1-points-recoloured')

	// The arrows vanish, leaving a hole in the middle of the row.
	draw('^TestVisualizationUpdate$/HideArrows')
	await page.waitForTimeout(2000)
	await robotPage.screenshotCanvas('VIZ-UPDATE-2-arrows-hidden')

	draw('^TestVisualizationUpdate$/ShowArrows')
	await page.waitForTimeout(2000)
	await robotPage.screenshotCanvas('VIZ-UPDATE-3-arrows-shown')

	// A pose change on a native Transform: the box lifts a metre clear of the row.
	draw('^TestVisualizationUpdate$/RaiseBox')
	await page.waitForTimeout(2000)
	await robotPage.screenshotCanvas('VIZ-UPDATE-4-box-raised')

	robotPage.assertScreenshots()
})

/**
 * 2,000 points delivered 200 at a time. The seed screenshot shows a short stub; the filled one
 * shows the full run, so the difference is the chunk pull working.
 */
withRobot('a chunked point cloud fills in', async ({ robotPage }) => {
	const { page } = robotPage

	draw('^TestVisualizationChunkedCloud$/Seed')
	await expect(page.getByText('viz-cloud', { exact: true })).toBeVisible({ timeout: 30_000 })
	await robotPage.screenshotCanvas('VIZ-CHUNK-0-first-chunk')

	draw('^TestVisualizationChunkedCloud$/Fill')
	await page.waitForTimeout(5000)
	await robotPage.screenshotCanvas('VIZ-CHUNK-1-filled')

	robotPage.assertScreenshots()
})

withRobot('removals take one entity at a time', async ({ robotPage }) => {
	const { page } = robotPage

	await expect(page.getByText('viz-line', { exact: true })).toBeVisible({ timeout: 30_000 })

	draw('^TestVisualizationRemove$/RemoveLine')
	await expect(page.getByText('viz-line', { exact: true })).toBeHidden({ timeout: 10_000 })
	// Its neighbours must survive, so the screenshot shows a gap rather than an empty scene.
	await expect(page.getByText('viz-points', { exact: true })).toBeVisible()
	await robotPage.screenshotCanvas('VIZ-REMOVE-0-line-gone')

	draw('^TestVisualizationRemove$/RemoveBox')
	await expect(page.getByText('viz-box', { exact: true })).toBeHidden({ timeout: 10_000 })
	await expect(page.getByText('viz-nurbs', { exact: true })).toBeVisible()
	await robotPage.screenshotCanvas('VIZ-REMOVE-1-box-gone')

	// world_state_store has no bulk signal, so this fans out to one REMOVED per entity.
	draw('^TestVisualizationRemove$/RemoveAll')
	await expect(page.getByText('viz-points', { exact: true })).toBeHidden({ timeout: 10_000 })
	await expect(page.getByText('viz-arrows', { exact: true })).toBeHidden()
	await expect(page.getByText('viz-nurbs', { exact: true })).toBeHidden()
	await expect(page.getByText('viz-cloud', { exact: true })).toBeHidden()
	await robotPage.screenshotCanvas('VIZ-REMOVE-2-empty')

	robotPage.assertScreenshots()
})
