import { type Browser, expect, type Page, test } from '@playwright/test'
import { exec, execSync } from 'node:child_process'
import { promisify } from 'node:util'

import { createDrawClient, resetScene } from './helpers/drawClient'
import { openScene } from './helpers/openScene'
import {
	captureCanvas,
	screenshotCanvas,
	waitForCanvasToChange,
	waitForCanvasToSettle,
} from './helpers/screenshot'

const execAsync = promisify(exec)

const takeScreenshot = (page: Page, testPrefix: string): Promise<void> =>
	expect.soft(page).toHaveScreenshot(`${testPrefix}.png`, { fullPage: true })

const drawClient = createDrawClient()

const cleanup = (page: Page) => resetScene(drawClient, page)

// The draw service outlives each page and replays every entity to a reconnecting
// client. A test that dies before its cleanup() would otherwise strand entities
// into later tests' snapshots.
test.beforeEach(async () => {
	await drawClient.removeAll({})
})

const snapshotAndReset = async (page: Page, testPrefix: string) => {
	await screenshotCanvas(page, testPrefix)
	await cleanup(page)
}

const runChunkedTest = async (browser: Browser, testPrefix: string, goTestPath: string) => {
	const page = await openScene(browser)

	const goTest = execAsync(
		`go test -run ${goTestPath} github.com/viam-labs/motion-tools/client/api -count=1 -timeout=300s`
	)

	await expect(page.getByRole('progressbar', { name: /Loading/ })).toBeVisible({
		timeout: 120_000,
	})

	await goTest

	await expect(page.getByRole('progressbar')).toHaveCount(0, { timeout: 120_000 })

	await screenshotCanvas(page, testPrefix)

	await cleanup(page)
}

test('draw service events lifecycle', async ({ browser }) => {
	const page = await openScene(browser)

	execSync(
		'go test -run ^TestDrawServiceEvents$/AddTransformAndDrawing github.com/viam-labs/motion-tools/client/api -count=1',
		{ encoding: 'utf8' }
	)

	await expect(page.getByText('lifecycle-box')).toBeVisible({ timeout: 10000 })
	await expect(page.getByText('lifecycle-line')).toBeVisible({ timeout: 10000 })
	await screenshotCanvas(page, 'DRAW_SERVICE_EVENTS_ADDED')

	execSync(
		'go test -run ^TestDrawServiceEvents$/UpdateTransformAndDrawing github.com/viam-labs/motion-tools/client/api -count=1',
		{ encoding: 'utf8' }
	)

	await expect(page.getByText('lifecycle-box')).toBeVisible({ timeout: 10000 })
	await expect(page.getByText('lifecycle-line')).toBeVisible({ timeout: 10000 })
	await screenshotCanvas(page, 'DRAW_SERVICE_EVENTS_UPDATED')

	execSync(
		'go test -run ^TestDrawServiceEvents$/RemoveAll github.com/viam-labs/motion-tools/client/api -count=1',
		{ encoding: 'utf8' }
	)

	await expect(page.getByText('No objects displayed', { exact: true })).toBeVisible({
		timeout: 15000,
	})
	await screenshotCanvas(page, 'DRAW_SERVICE_EVENTS_REMOVED')

	await cleanup(page)
})

test('invisible entity', async ({ browser }) => {
	const page = await openScene(browser)

	execSync(
		'go test -run ^TestInvisible$/DrawVisible github.com/viam-labs/motion-tools/client/api -count=1',
		{ encoding: 'utf8' }
	)

	await expect(page.getByText('invisible-box')).toBeVisible({ timeout: 10000 })
	await screenshotCanvas(page, 'INVISIBLE_ENTITY_VISIBLE')

	execSync(
		'go test -run ^TestInvisible$/DrawInvisible github.com/viam-labs/motion-tools/client/api -count=1',
		{ encoding: 'utf8' }
	)

	await expect(page.getByText('invisible-box')).toBeVisible({ timeout: 10000 })
	await screenshotCanvas(page, 'INVISIBLE_ENTITY_INVISIBLE')

	await cleanup(page)
})

test('show axes helper', async ({ browser }) => {
	const page = await openScene(browser)

	execSync(
		'go test -run ^TestShowAxesHelper$/DrawWithAxesHelper github.com/viam-labs/motion-tools/client/api -count=1',
		{ encoding: 'utf8' }
	)

	await expect(page.getByText('show-axes-helper-box')).toBeVisible({ timeout: 10000 })
	await screenshotCanvas(page, 'SHOW_AXES_HELPER_WITH')

	execSync(
		'go test -run ^TestShowAxesHelper$/DrawWithoutAxesHelper github.com/viam-labs/motion-tools/client/api -count=1',
		{ encoding: 'utf8' }
	)

	await expect(page.getByText('show-axes-helper-box')).toBeVisible({ timeout: 10000 })
	await screenshotCanvas(page, 'SHOW_AXES_HELPER_WITHOUT')

	await cleanup(page)
})

test('draw frame system', async ({ browser }) => {
	const testPrefix = 'DRAW_FRAME_SYSTEM'
	const page = await openScene(browser)

	execSync(
		'go test -run ^TestDrawFrameSystem$/DrawFrameSystem github.com/viam-labs/motion-tools/client/api -count=1',
		{
			encoding: 'utf8',
		}
	)

	await expect(page.getByText('No objects displayed', { exact: true })).not.toBeVisible()

	await snapshotAndReset(page, testPrefix)
})

test('draw hierarchy', async ({ browser }) => {
	const testPrefix = 'DRAW_HIERARCHY'
	const page = await openScene(browser)

	execSync(
		'go test -run ^TestDrawHierarchy$/DrawHierarchy github.com/viam-labs/motion-tools/client/api -count=1',
		{
			encoding: 'utf8',
		}
	)

	await expect(page.getByText('zulu', { exact: true })).toBeVisible()
	await expect(page.getByText('bravo', { exact: true })).toBeVisible()

	await page
		.locator('[data-part="branch-control"]')
		.filter({ hasText: 'zulu' })
		.locator('[data-part="branch-trigger"]')
		.click()
	await expect(page.getByText('tango', { exact: true })).toBeVisible()
	await expect(page.getByText('delta', { exact: true })).toBeVisible()

	await takeScreenshot(page, `${testPrefix}_ZULU_EXPANDED`)

	await page
		.locator('[data-part="branch-control"]')
		.filter({ hasText: 'tango' })
		.locator('[data-part="branch-trigger"]')
		.click()
	await expect(page.getByText('sierra', { exact: true })).toBeVisible()
	await expect(page.getByText('foxtrot', { exact: true })).toBeVisible()

	await takeScreenshot(page, `${testPrefix}_TANGO_EXPANDED`)

	await cleanup(page)
})

test('draw frames', async ({ browser }) => {
	const testPrefix = 'DRAW_FRAMES'
	const page = await openScene(browser)

	execSync(
		'go test -run ^TestDrawFrames$/DrawFrames github.com/viam-labs/motion-tools/client/api -count=1',
		{
			encoding: 'utf8',
		}
	)

	await expect(page.getByText('DrawFrames Axes')).toBeVisible()
	await expect(page.getByText('DrawFrames Sphere')).toBeVisible()
	await expect(page.getByText('DrawFrames Capsule:Capsule')).toBeVisible()

	await snapshotAndReset(page, testPrefix)
})

test('draw geometries', async ({ browser }) => {
	const testPrefix = 'DRAW_GEOMETRIES'
	const page = await openScene(browser)

	execSync(
		'go test -run ^TestDrawGeometries$/DrawGeometries github.com/viam-labs/motion-tools/client/api -count=1',
		{
			encoding: 'utf8',
		}
	)

	await expect(page.getByText('DrawGeometries Box')).toBeVisible()
	await expect(page.getByText('DrawGeometries Sphere')).toBeVisible()
	await expect(page.getByText('DrawGeometries Capsule')).toBeVisible()
	await expect(page.getByText('DrawGeometries Mesh')).toBeVisible()
	await expect(page.getByText('DrawGeometries PointCloud')).toBeVisible()

	await snapshotAndReset(page, testPrefix)
})

test('draw geometry', async ({ browser }) => {
	const testPrefix = 'DRAW_GEOMETRY'
	const page = await openScene(browser)

	execSync(
		'go test -run "^TestDrawGeometry$/(DrawGeometry_box|DrawGeometry_sphere|DrawGeometry_capsule|DrawGeometry_mesh)" github.com/viam-labs/motion-tools/client/api -count=1',
		{
			encoding: 'utf8',
		}
	)

	await expect(page.getByText('DrawGeometry box')).toBeVisible()
	await expect(page.getByText('DrawGeometry sphere')).toBeVisible()
	await expect(page.getByText('DrawGeometry capsule')).toBeVisible()
	await expect(page.getByText('DrawGeometry mesh')).toBeVisible()

	await snapshotAndReset(page, testPrefix)
})

test('draw geometry updating', async ({ browser }) => {
	const testPrefix = 'DRAW_GEOMETRY_UPDATING'
	const page = await openScene(browser)

	execSync(
		'go test -run "^TestDrawGeometry$/DrawGeometry_updating" github.com/viam-labs/motion-tools/client/api -count=1',
		{
			encoding: 'utf8',
		}
	)

	await expect(page.getByText('DrawGeometry box updating')).toBeVisible()

	await snapshotAndReset(page, testPrefix)
})

test('draw point cloud', async ({ browser }) => {
	const testPrefix = 'DRAW_POINT_CLOUD'
	const page = await openScene(browser)

	execSync(
		'go test -run ^TestDrawPointCloud$/DrawPointClouds github.com/viam-labs/motion-tools/client/api -count=1',
		{
			encoding: 'utf8',
		}
	)

	await expect(page.getByText('octagon')).toBeVisible()
	await expect(page.getByText('Zaghetto')).toBeVisible()
	await expect(page.getByText('simple')).toBeVisible()
	await expect(page.getByText('boat')).toBeVisible()

	await snapshotAndReset(page, testPrefix)
})

test('draw point cloud updating', async ({ browser }) => {
	const testPrefix = 'DRAW_POINT_CLOUD_UPDATING'
	const page = await openScene(browser)

	execSync(
		'go test -run ^TestDrawPointCloudUpdating$/DrawPointCloudUpdating github.com/viam-labs/motion-tools/client/api -count=1',
		{
			encoding: 'utf8',
		}
	)

	await expect(page.getByText('DrawPointCloud updating')).toBeVisible()

	await snapshotAndReset(page, testPrefix)
})

test('draw point cloud in chunks', async ({ browser }) => {
	await runChunkedTest(
		browser,
		'DRAW_POINT_CLOUD_IN_CHUNKS',
		'^TestDrawPointCloud$/^DrawPointCloudInChunks$'
	)
})

test('draw point cloud in chunks with palette', async ({ browser }) => {
	await runChunkedTest(
		browser,
		'DRAW_POINT_CLOUD_IN_CHUNKS_WITH_PALETTE',
		'^TestDrawPointCloud$/DrawPointCloudInChunksWithPalette'
	)
})

test('draw point cloud in chunks with per point colors', async ({ browser }) => {
	await runChunkedTest(
		browser,
		'DRAW_POINT_CLOUD_IN_CHUNKS_WITH_PER_POINT_COLORS',
		'^TestDrawPointCloud$/DrawPointCloudInChunksWithPerPointColors'
	)
})

test('draw point cloud in chunks with uniform opacity', async ({ browser }) => {
	await runChunkedTest(
		browser,
		'DRAW_POINT_CLOUD_IN_CHUNKS_WITH_UNIFORM_OPACITY',
		'^TestDrawPointCloud$/DrawPointCloudInChunksWithUniformOpacity'
	)
})

test('chunked point cloud survives a reconnect', async ({ browser }) => {
	const testPrefix = 'CHUNKED_POINT_CLOUD_RECONNECT'
	const page = await openScene(browser)

	// The small chunked cloud on purpose: this test loads one twice, and the
	// multi-million point fixtures are too slow to do that inside the timeout.
	// Several chunks with per-point colors is all the coverage needs.
	execSync(
		'go test -run ^TestDrawPointCloud$/DrawSmallChunkedPointCloud github.com/viam-labs/motion-tools/client/api -count=1',
		{ encoding: 'utf8' }
	)

	await expect(page.getByText('chunked_point_cloud_small')).toBeVisible({ timeout: 30_000 })
	await expect(page.getByRole('progressbar')).toHaveCount(0, { timeout: 60_000 })

	// Reload rather than reconnect the socket: either way the client resubscribes and the service
	// replays the scene, and a reload is the one a user actually performs.
	await page.reload()
	await expect(page.getByText('World', { exact: true })).toBeVisible({ timeout: 30_000 })
	await expect(page.getByText('chunked_point_cloud_small')).toBeVisible({ timeout: 30_000 })

	// A replayed chunked entity has to finish pulling. A missing chunks descriptor
	// means the client never starts, and a stalled pull means it never ends. Either
	// way the scene holds only the first chunk.
	const progress = page.getByRole('progressbar', { name: /Loading/ })
	const stalledAt = async () =>
		`pull did not finish, last progress: ${await progress.getAttribute('aria-label')}`
	await expect(progress)
		.toHaveCount(0, { timeout: 60_000 })
		.catch(async (error: unknown) => {
			throw new Error(await stalledAt(), { cause: error })
		})

	// The snapshot catches a partial pull that still cleared the progress bar: a cloud missing
	// most of its chunks looks obviously wrong.
	await waitForCanvasToSettle(page, { timeoutMs: 30_000 })
	await snapshotAndReset(page, testPrefix)
})

test('draw geometries updating', async ({ browser }) => {
	const testPrefix = 'DRAW_GEOMETRIES_UPDATING'
	const page = await openScene(browser)

	execSync(
		'go test -run ^TestDrawGeometriesUpdating$/DrawGeometriesUpdating github.com/viam-labs/motion-tools/client/api -count=1',
		{
			encoding: 'utf8',
		}
	)

	await expect(page.getByText('DrawGeometries box1 updating')).toBeVisible()
	await expect(page.getByText('DrawGeometries box2 updating')).toBeVisible()
	await expect(page.getByText('DrawGeometries box3 updating')).toBeVisible()

	await snapshotAndReset(page, testPrefix)
})

test('draw world state', async ({ browser }) => {
	const testPrefix = 'DRAW_WORLD_STATE'
	const page = await openScene(browser)

	execSync(
		'go test -run ^TestDrawWorldState$/DrawWorldState github.com/viam-labs/motion-tools/client/api -count=1',
		{
			encoding: 'utf8',
		}
	)

	await expect(page.getByText('box0')).toBeVisible()
	await expect(page.getByText('box1')).toBeVisible()
	await expect(page.getByText('box2')).toBeVisible()

	await snapshotAndReset(page, testPrefix)
})

test('draw nurbs', async ({ browser }) => {
	const testPrefix = 'DRAW_NURBS'
	const page = await openScene(browser)

	execSync(
		'go test -run ^TestDrawNurbs$/DrawNurbs github.com/viam-labs/motion-tools/client/api -count=1',
		{
			encoding: 'utf8',
		}
	)

	await expect(page.getByText('nurbs-1')).toBeVisible()

	await snapshotAndReset(page, testPrefix)
})

test('draw lines', async ({ browser }) => {
	const testPrefix = 'DRAW_LINE'
	const page = await openScene(browser)

	execSync(
		'go test -run ^TestDrawLine$/DrawLine$ github.com/viam-labs/motion-tools/client/api -count=1',
		{
			encoding: 'utf8',
		}
	)

	await expect(page.getByText('upwardSpiral')).toBeVisible()

	await snapshotAndReset(page, testPrefix)
})

test('draw lines with line color', async ({ browser }) => {
	const testPrefix = 'DRAW_LINE_WITH_LINE_COLOR'
	const page = await openScene(browser)

	execSync(
		'go test -run ^TestDrawLine$/DrawLineWithLineColor$ github.com/viam-labs/motion-tools/client/api -count=1',
		{
			encoding: 'utf8',
		}
	)

	await expect(page.getByText('upwardSpiralLineColor')).toBeVisible()

	await snapshotAndReset(page, testPrefix)
})

test('draw lines with dot color', async ({ browser }) => {
	const testPrefix = 'DRAW_LINE_WITH_DOT_COLOR'
	const page = await openScene(browser)

	execSync(
		'go test -run ^TestDrawLine$/DrawLineWithDotColor$ github.com/viam-labs/motion-tools/client/api -count=1',
		{
			encoding: 'utf8',
		}
	)

	await expect(page.getByText('upwardSpiralDotColor')).toBeVisible()

	await snapshotAndReset(page, testPrefix)
})

test('draw lines with line width', async ({ browser }) => {
	const testPrefix = 'DRAW_LINE_WITH_LINE_WIDTH'
	const page = await openScene(browser)

	execSync(
		'go test -run ^TestDrawLine$/DrawLineWithLineWidth$ github.com/viam-labs/motion-tools/client/api -count=1',
		{
			encoding: 'utf8',
		}
	)

	await expect(page.getByText('upwardSpiralLineWidth')).toBeVisible()

	await snapshotAndReset(page, testPrefix)
})

test('draw lines with dot size', async ({ browser }) => {
	const testPrefix = 'DRAW_LINE_WITH_DOT_SIZE'
	const page = await openScene(browser)

	execSync(
		'go test -run ^TestDrawLine$/DrawLineWithDotSize$ github.com/viam-labs/motion-tools/client/api -count=1',
		{
			encoding: 'utf8',
		}
	)

	await expect(page.getByText('upwardSpiralDotSize')).toBeVisible()

	await snapshotAndReset(page, testPrefix)
})

test('draw lines with line color palette', async ({ browser }) => {
	const testPrefix = 'DRAW_LINE_WITH_LINE_COLOR_PALETTE'
	const page = await openScene(browser)

	execSync(
		'go test -run ^TestDrawLine$/DrawLineWithLineColorPalette$ github.com/viam-labs/motion-tools/client/api -count=1',
		{
			encoding: 'utf8',
		}
	)

	await expect(page.getByText('upwardSpiralLineColorPalette')).toBeVisible()

	await snapshotAndReset(page, testPrefix)
})

test('draw lines with per-line colors', async ({ browser }) => {
	const testPrefix = 'DRAW_LINE_WITH_PER_LINE_COLORS'
	const page = await openScene(browser)

	execSync(
		'go test -run ^TestDrawLine$/DrawLineWithPerLineColors$ github.com/viam-labs/motion-tools/client/api -count=1',
		{
			encoding: 'utf8',
		}
	)

	await expect(page.getByText('upwardSpiralPerLineColors')).toBeVisible()

	await snapshotAndReset(page, testPrefix)
})

test('draw lines with dot color palette', async ({ browser }) => {
	const testPrefix = 'DRAW_LINE_WITH_DOT_COLOR_PALETTE'
	const page = await openScene(browser)

	execSync(
		'go test -run ^TestDrawLine$/DrawLineWithDotColorPalette$ github.com/viam-labs/motion-tools/client/api -count=1',
		{
			encoding: 'utf8',
		}
	)

	await expect(page.getByText('upwardSpiralDotColorPalette')).toBeVisible()

	await snapshotAndReset(page, testPrefix)
})

test('draw lines with per-dot colors', async ({ browser }) => {
	const testPrefix = 'DRAW_LINE_WITH_PER_DOT_COLORS'
	const page = await openScene(browser)

	execSync(
		'go test -run ^TestDrawLine$/DrawLineWithPerDotColors$ github.com/viam-labs/motion-tools/client/api -count=1',
		{
			encoding: 'utf8',
		}
	)

	await expect(page.getByText('upwardSpiralPerDotColors')).toBeVisible()

	await snapshotAndReset(page, testPrefix)
})

test('draw points', async ({ browser }) => {
	const testPrefix = 'DRAW_POINTS'
	const page = await openScene(browser)

	execSync(
		'go test -run ^TestDrawPoints$/DrawPoints$ github.com/viam-labs/motion-tools/client/api -count=1',
		{
			encoding: 'utf8',
		}
	)

	await expect(page.getByText('myPoints')).toBeVisible()

	await snapshotAndReset(page, testPrefix)
})

test('draw points with single color', async ({ browser }) => {
	const testPrefix = 'DRAW_POINTS_WITH_SINGLE_COLOR'
	const page = await openScene(browser)

	execSync(
		'go test -run ^TestDrawPoints$/DrawPointsWithSingleColor$ github.com/viam-labs/motion-tools/client/api -count=1',
		{
			encoding: 'utf8',
		}
	)

	await expect(page.getByText('myPointsSingleColor')).toBeVisible()

	await snapshotAndReset(page, testPrefix)
})

test('draw points with color palette', async ({ browser }) => {
	const testPrefix = 'DRAW_POINTS_WITH_COLOR_PALETTE'
	const page = await openScene(browser)

	execSync(
		'go test -run ^TestDrawPoints$/DrawPointsWithColorPalette$ github.com/viam-labs/motion-tools/client/api -count=1',
		{
			encoding: 'utf8',
		}
	)

	await expect(page.getByText('myPointsPalette')).toBeVisible()

	await snapshotAndReset(page, testPrefix)
})

test('draw points with per point color', async ({ browser }) => {
	const testPrefix = 'DRAW_POINTS_WITH_PER_POINT_COLOR'
	const page = await openScene(browser)

	execSync(
		'go test -run ^TestDrawPoints$/DrawPointsWithPerPointColors$ github.com/viam-labs/motion-tools/client/api -count=1',
		{
			encoding: 'utf8',
		}
	)

	await expect(page.getByText('myPointsPerPoint')).toBeVisible()

	await snapshotAndReset(page, testPrefix)
})

test('draw points with point size', async ({ browser }) => {
	const testPrefix = 'DRAW_POINTS_WITH_POINT_SIZE'
	const page = await openScene(browser)

	execSync(
		'go test -run ^TestDrawPoints$/DrawPointsWithPointSize$ github.com/viam-labs/motion-tools/client/api -count=1',
		{
			encoding: 'utf8',
		}
	)

	await expect(page.getByText('myPointsWithSize')).toBeVisible()

	await snapshotAndReset(page, testPrefix)
})

test('draw points in chunks', async ({ browser }) => {
	await runChunkedTest(browser, 'DRAW_POINTS_IN_CHUNKS', '^TestDrawPoints$/DrawPointsInChunks')
})

test('draw poses as arrows', async ({ browser }) => {
	const testPrefix = 'DRAW_POSES_AS_ARROWS'
	const page = await openScene(browser)

	execSync(
		'go test -run ^TestDrawPosesAsArrows$/DrawPosesAsArrows$ github.com/viam-labs/motion-tools/client/api -count=1',
		{
			encoding: 'utf8',
		}
	)

	await expect(page.getByText('mySpherePoses', { exact: true })).toBeVisible()
	await expect(page.getByText('mySphere', { exact: true })).toBeVisible()

	await snapshotAndReset(page, testPrefix)
})

const drawArrowsUpdateStep = (step: 'Start' | 'Move' | 'MoveAgain') => {
	execSync(
		`go test -run '^TestDrawPosesAsArrowsUpdating$/^${step}$' github.com/viam-labs/motion-tools/client/api -count=1`,
		{ encoding: 'utf8' }
	)
}

test('draw poses as arrows updating', async ({ browser }) => {
	const testPrefix = 'DRAW_POSES_AS_ARROWS_UPDATING'
	const page = await openScene(browser)

	drawArrowsUpdateStep('Start')
	await expect(page.getByText('DrawPosesAsArrows updating')).toBeVisible({ timeout: 10000 })
	await page.waitForTimeout(1000)
	const initial = await captureCanvas(page)
	await screenshotCanvas(page, `${testPrefix}_0_START`)

	drawArrowsUpdateStep('Move')
	const moved = await waitForCanvasToChange(page, initial)
	expect(moved, 'arrows did not move on the first same-UUID redraw').not.toBeNull()
	await screenshotCanvas(page, `${testPrefix}_1_MOVED`)

	drawArrowsUpdateStep('MoveAgain')
	const movedAgain = await waitForCanvasToChange(page, moved ?? initial)
	expect(movedAgain, 'arrows did not move on the second same-UUID redraw').not.toBeNull()
	await screenshotCanvas(page, `${testPrefix}_2_MOVED_AGAIN`)

	await cleanup(page)
})

test('draw poses as arrows with color palette', async ({ browser }) => {
	const testPrefix = 'DRAW_POSES_AS_ARROWS_WITH_COLOR_PALETTE'
	const page = await openScene(browser)

	execSync(
		'go test -run ^TestDrawPosesAsArrows$/DrawPosesAsArrowsWithColorPalette$ github.com/viam-labs/motion-tools/client/api -count=1',
		{
			encoding: 'utf8',
		}
	)

	await expect(page.getByText('mySpherePoses', { exact: true })).toBeVisible()
	await expect(page.getByText('mySphere', { exact: true })).toBeVisible()

	await snapshotAndReset(page, testPrefix)
})

test('draw poses as arrows with single color', async ({ browser }) => {
	const testPrefix = 'DRAW_POSES_AS_ARROWS_WITH_SINGLE_COLOR'
	const page = await openScene(browser)

	execSync(
		'go test -run ^TestDrawPosesAsArrows$/DrawPosesAsArrowsWithSingleColor$ github.com/viam-labs/motion-tools/client/api -count=1',
		{
			encoding: 'utf8',
		}
	)

	await expect(page.getByText('mySpherePoses', { exact: true })).toBeVisible()
	await expect(page.getByText('mySphere', { exact: true })).toBeVisible()

	await snapshotAndReset(page, testPrefix)
})

test('draw poses as arrows with per point color', async ({ browser }) => {
	const testPrefix = 'DRAW_POSES_AS_ARROWS_WITH_PER_POINT_COLOR'
	const page = await openScene(browser)

	execSync(
		'go test -run ^TestDrawPosesAsArrows$/DrawPosesAsArrowsWithPerPointColors$ github.com/viam-labs/motion-tools/client/api -count=1',
		{
			encoding: 'utf8',
		}
	)

	await expect(page.getByText('mySpherePoses', { exact: true })).toBeVisible()
	await expect(page.getByText('mySphere', { exact: true })).toBeVisible()

	await snapshotAndReset(page, testPrefix)
})

test('draw gltf', async ({ browser }) => {
	const testPrefix = 'DRAW_GLTF'
	const page = await openScene(browser)

	execSync(
		'go test -run ^TestDrawGLTF$/^DrawGLTF$ github.com/viam-labs/motion-tools/client/api -count=1',
		{
			encoding: 'utf8',
		}
	)

	await expect(page.getByText('flamingo', { exact: true })).toBeVisible()

	await snapshotAndReset(page, testPrefix)
})

test('draw point clouds', async ({ browser }) => {
	const testPrefix = 'DRAW_POINT_CLOUDS'
	const page = await openScene(browser)

	execSync(
		'go test -run ^TestDrawPointCloud$/DrawPointClouds github.com/viam-labs/motion-tools/client/api -count=1',
		{
			encoding: 'utf8',
		}
	)

	await page.getByText('octagon').waitFor({ state: 'visible' })
	await page.getByText('Zaghetto').waitFor({ state: 'visible' })
	await page.getByText('simple').waitFor({ state: 'visible' })
	await page.getByText('boat').waitFor({ state: 'visible' })

	await snapshotAndReset(page, testPrefix)
})

test('draw point clouds with downscaling', async ({ browser }) => {
	const testPrefix = 'DRAW_POINT_CLOUDS_WITH_DOWNSCALING'
	const page = await openScene(browser)

	execSync(
		'go test -run ^TestDrawPointCloud$/DrawPointCloudWithDownscaling github.com/viam-labs/motion-tools/client/api -count=1',
		{
			encoding: 'utf8',
		}
	)

	await expect(page.getByText('boat_downscaled')).toBeVisible()

	await snapshotAndReset(page, testPrefix)
})

test('draw point clouds with single color', async ({ browser }) => {
	const testPrefix = 'DRAW_POINT_CLOUDS_WITH_SINGLE_COLOR'
	const page = await openScene(browser)

	execSync(
		'go test -run ^TestDrawPointCloud$/DrawSingleColorPointCloud github.com/viam-labs/motion-tools/client/api -count=1',
		{
			encoding: 'utf8',
		}
	)

	await expect(page.getByText('octagon_single_color')).toBeVisible()

	await snapshotAndReset(page, testPrefix)
})

test('draw point cloud with opacity', async ({ browser }) => {
	const testPrefix = 'DRAW_POINT_CLOUD_WITH_OPACITY'
	const page = await openScene(browser)

	execSync(
		'go test -run ^TestDrawPointCloud$/DrawSingleColorPointCloudWithOpacity github.com/viam-labs/motion-tools/client/api -count=1',
		{
			encoding: 'utf8',
		}
	)

	await expect(page.getByText('octagon_with_opacity')).toBeVisible()

	await snapshotAndReset(page, testPrefix)
})

test('draw point clouds with color palette', async ({ browser }) => {
	const testPrefix = 'DRAW_POINT_CLOUDS_WITH_COLOR_PALETTE'
	const page = await openScene(browser)

	execSync(
		'go test -run ^TestDrawPointCloud$/DrawPaletteColorPointCloud github.com/viam-labs/motion-tools/client/api -count=1',
		{
			encoding: 'utf8',
		}
	)

	await expect(page.getByText('Zaghetto_palette')).toBeVisible()

	await snapshotAndReset(page, testPrefix)
})

test('draw point clouds with per point color', async ({ browser }) => {
	const testPrefix = 'DRAW_POINT_CLOUDS_WITH_PER_POINT_COLOR'
	const page = await openScene(browser)

	execSync(
		'go test -run ^TestDrawPointCloud$/DrawPerPointColorPointCloud github.com/viam-labs/motion-tools/client/api -count=1',
		{
			encoding: 'utf8',
		}
	)

	await expect(page.getByText('simple_per_point')).toBeVisible()

	await snapshotAndReset(page, testPrefix)
})

test('set camera pose', async ({ browser }) => {
	const testPrefix = 'SET_CAMERA_POSE'
	const page = await openScene(browser)

	execSync(
		'go test -run ^TestSetCamera$/SetCameraTopDown github.com/viam-labs/motion-tools/client/api -count=1',
		{
			encoding: 'utf8',
		}
	)

	await expect(page.getByText('reference_box')).toBeVisible()

	await screenshotCanvas(page, `${testPrefix}_SET_CAMERA`)

	execSync(
		'go test -run ^TestSetCamera$/ResetCamera github.com/viam-labs/motion-tools/client/api -count=1',
		{
			encoding: 'utf8',
		}
	)

	await screenshotCanvas(page, `${testPrefix}_RESET_CAMERA`)

	await cleanup(page)
})

test('remove all', async ({ browser }) => {
	const testPrefix = 'REMOVE_ALL'
	const page = await openScene(browser)

	execSync(
		'go test -run ^TestRemoveAll$/RemoveAllSetup github.com/viam-labs/motion-tools/client/api -count=1',
		{
			encoding: 'utf8',
		}
	)

	await expect(page.getByText('box2delete')).toBeVisible({ timeout: 10000 })
	await screenshotCanvas(page, `${testPrefix}_SETUP`)

	execSync(
		'go test -run ^TestRemoveAll$/RemoveAll github.com/viam-labs/motion-tools/client/api -count=1',
		{
			encoding: 'utf8',
		}
	)

	await expect(page.getByText('box2delete')).not.toBeVisible({ timeout: 10000 })
	await screenshotCanvas(page, testPrefix)

	await cleanup(page)
})

test('remove drawings', async ({ browser }) => {
	const testPrefix = 'REMOVE_DRAWINGS'
	const page = await openScene(browser)

	execSync(
		'go test -run ^TestRemoveDrawings$/RemoveDrawingsSetup github.com/viam-labs/motion-tools/client/api -count=1',
		{
			encoding: 'utf8',
		}
	)

	await expect(page.getByText('box2delete')).toBeVisible({ timeout: 10000 })
	await screenshotCanvas(page, `${testPrefix}_SETUP`)

	execSync(
		'go test -run ^TestRemoveDrawings$/RemoveDrawings github.com/viam-labs/motion-tools/client/api -count=1',
		{
			encoding: 'utf8',
		}
	)

	await expect(page.getByText('box2delete')).toBeVisible({ timeout: 10000 })
	await screenshotCanvas(page, testPrefix)

	await cleanup(page)
})

test('remove transforms', async ({ browser }) => {
	const testPrefix = 'REMOVE_TRANSFORMS'
	const page = await openScene(browser)

	execSync(
		'go test -run ^TestRemoveTransforms$/RemoveTransformsSetup github.com/viam-labs/motion-tools/client/api -count=1',
		{
			encoding: 'utf8',
		}
	)

	await expect(page.getByText('box2delete')).toBeVisible({ timeout: 10000 })
	await screenshotCanvas(page, `${testPrefix}_SETUP`)

	execSync(
		'go test -run ^TestRemoveTransforms$/RemoveTransforms github.com/viam-labs/motion-tools/client/api -count=1',
		{
			encoding: 'utf8',
		}
	)

	await expect(page.getByText('box2delete')).not.toBeVisible({ timeout: 10000 })
	await screenshotCanvas(page, testPrefix)

	await cleanup(page)
})

test('replay', async ({ browser }) => {
	const testPrefix = 'REPLAY'
	const page = await openScene(browser)

	execSync(
		'go test -run ^TestReplay$/ReplayRecord github.com/viam-labs/motion-tools/client/api -count=1',
		{
			encoding: 'utf8',
		}
	)

	await expect(page.getByText('bouncing_ball')).toBeVisible()

	await screenshotCanvas(page, `${testPrefix}_RECORD`)

	await cleanup(page)

	execSync(
		'go test -run ^TestReplay$/ReplayPlayback github.com/viam-labs/motion-tools/client/api -count=1',
		{
			encoding: 'utf8',
		}
	)

	await expect(page.getByText('bouncing_ball')).toBeVisible()

	await screenshotCanvas(page, `${testPrefix}_PLAYBACK`)

	await cleanup(page)
})

const runRedrawLoop = async (browser: Browser, testPrefix: string, step: string) => {
	const page = await openScene(browser)

	execSync(
		`go test -run ^TestRedrawLoop$/${step}$ github.com/viam-labs/motion-tools/client/api -count=1`,
		{ encoding: 'utf8' }
	)

	await expect(page.getByText('redraw-box-00', { exact: true })).toBeVisible({ timeout: 10000 })

	// The tree is virtualized, so counting rows proves nothing. The canvas is the
	// assertion: the boxes are a 6x4 grid in a fixed palette, so a lost change reads
	// as a hole and a misapplied one as a wrong-colored cell.
	await waitForCanvasToSettle(page)
	await snapshotAndReset(page, testPrefix)
}

/**
 * The reported failure: a producer clearing the scene and redrawing it every tick.
 *
 * Both tests below draw the identical grid and must produce the identical image. The first clears
 * before each redraw, the second does not, and the point is that the visualizer converges to the
 * same scene either way. Before this fix the clearing variant lost entities: a removal and the
 * re-add that followed it could land in the same animation frame, where the re-add was discarded.
 */
test('redraw loop clearing and redrawing', async ({ browser }) => {
	await runRedrawLoop(browser, 'REDRAW_LOOP_WITH_CLEAR', 'RedrawLoop')
})

// The pattern we recommend instead: identities are deterministic, so redrawing upserts in place
// and the service never publishes a removal at all.
test('redraw loop without clearing', async ({ browser }) => {
	await runRedrawLoop(browser, 'REDRAW_LOOP_NO_CLEAR', 'RedrawWithoutClearing')
})

test('update entity partial updates', async ({ browser }) => {
	const testPrefix = 'UPDATE_ENTITY'
	const page = await openScene(browser)

	execSync(
		'go test -run ^TestUpdateEntity$/Setup$ github.com/viam-labs/motion-tools/client/api -count=1',
		{ encoding: 'utf8' }
	)

	await expect(page.getByText('update-entity box')).toBeVisible({ timeout: 10000 })
	await expect(page.getByText('update-entity points')).toBeVisible({ timeout: 10000 })
	const initial = await waitForCanvasToSettle(page)
	await screenshotCanvas(page, `${testPrefix}_0_SETUP`)

	// Each step screenshots after the canvas settles, not at the first changed pixel.
	// A mesh and its axes helper are flushed by separate batched renderers, so the
	// first differing frame can show the box moved with its helper still behind.
	const applyStep = async (step: string, reference: Buffer, description: string) => {
		execSync(
			`go test -run ^TestUpdateEntity$/${step}$ github.com/viam-labs/motion-tools/client/api -count=1`,
			{ encoding: 'utf8' }
		)

		const changed = await waitForCanvasToChange(page, reference)
		expect(changed, description).not.toBeNull()
		return waitForCanvasToSettle(page)
	}

	// A pose-only update: the box moves without its geometry or color being resent.
	const moved = await applyStep('MoveTransform', initial, 'box did not move on a pose-only update')
	await expect(page.getByText('update-entity box')).toBeVisible()
	await screenshotCanvas(page, `${testPrefix}_1_MOVED`)

	// A metadata-only update: the box recolors and must stay where the move put it.
	const recoloredBox = await applyStep(
		'RecolorTransform',
		moved,
		'box did not recolor on a metadata-only update'
	)
	await screenshotCanvas(page, `${testPrefix}_2_BOX_RECOLORED`)

	// The same for a drawing: the points recolor without their positions being resent.
	await applyStep(
		'RecolorDrawing',
		recoloredBox,
		'points did not recolor on a metadata-only update'
	)
	await expect(page.getByText('update-entity points')).toBeVisible()
	await screenshotCanvas(page, `${testPrefix}_3_POINTS_RECOLORED`)

	await cleanup(page)
})

test('remove entity', async ({ browser }) => {
	const testPrefix = 'REMOVE_ENTITY'
	const page = await openScene(browser)

	execSync(
		'go test -run ^TestRemoveEntity$/Setup$ github.com/viam-labs/motion-tools/client/api -count=1',
		{ encoding: 'utf8' }
	)

	await expect(page.getByText('remove-entity keep')).toBeVisible({ timeout: 10000 })
	await expect(page.getByText('remove-entity drop')).toBeVisible({ timeout: 10000 })
	await screenshotCanvas(page, `${testPrefix}_SETUP`)

	execSync(
		'go test -run ^TestRemoveEntity$/RemoveOne$ github.com/viam-labs/motion-tools/client/api -count=1',
		{ encoding: 'utf8' }
	)

	// Only the targeted entity goes. The rest of the scene is untouched.
	await expect(page.getByText('remove-entity drop')).not.toBeVisible({ timeout: 10000 })
	await expect(page.getByText('remove-entity keep')).toBeVisible()
	await screenshotCanvas(page, testPrefix)

	await cleanup(page)
})

test('relationships', async ({ browser }) => {
	const page = await openScene(browser)

	execSync(
		'go test -run ^TestRelationships$/Setup github.com/viam-labs/motion-tools/client/api -count=1',
		{ encoding: 'utf8' }
	)

	await expect(page.getByText('rel-source', { exact: true })).toBeVisible({ timeout: 10000 })
	await expect(page.getByText('rel-target', { exact: true })).toBeVisible({ timeout: 10000 })

	execSync(
		'go test -run ^TestRelationships$/CreateRelationship github.com/viam-labs/motion-tools/client/api -count=1',
		{ encoding: 'utf8' }
	)

	await page.getByText('rel-source', { exact: true }).click()
	await expect(page.getByText('rel-target (HoverLink)')).toBeVisible({ timeout: 10000 })
	await takeScreenshot(page, 'RELATIONSHIPS_CREATED')

	// TODO(relationships): reload-persistence is not checked here. StreamEntityChanges
	// replays entities to a reconnecting client but not relationships, so a HoverLink
	// is lost on reload. Re-enable once relationships survive a reload.

	execSync(
		'go test -run ^TestRelationships$/DeleteRelationship github.com/viam-labs/motion-tools/client/api -count=1',
		{ encoding: 'utf8' }
	)

	await expect(page.getByText('rel-target (HoverLink)')).not.toBeVisible({ timeout: 10000 })
	await takeScreenshot(page, 'RELATIONSHIPS_DELETED')

	await cleanup(page)
})
