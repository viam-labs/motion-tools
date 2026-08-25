import { expect, type GoTest, type GoTestAsync, type Page, test } from './fixtures/drawing'
import {
	captureCanvas,
	screenshotCanvas,
	waitForCanvasToChange,
	waitForCanvasToSettle,
} from './helpers/screenshot'

// The draw server outlives each page and replays every entity to a reconnecting
// client. A test that dies before its reset would otherwise strand entities into
// the snapshots of later tests sharing this worker's server.
test.beforeEach(async ({ drawClient }) => {
	await drawClient.removeAll({})
})

interface ChunkedRun {
	page: Page
	goTestAsync: GoTestAsync
	snapshotAndReset: (testPrefix: string) => Promise<void>
}

const runChunkedTest = async (
	{ page, goTestAsync, snapshotAndReset }: ChunkedRun,
	testPrefix: string,
	goTestPath: string
) => {
	const pull = goTestAsync(goTestPath, { timeoutSeconds: 300 })

	await expect(page.getByRole('progressbar', { name: /Loading/ })).toBeVisible({
		timeout: 120_000,
	})

	await pull

	await expect(page.getByRole('progressbar')).toHaveCount(0, { timeout: 120_000 })

	await snapshotAndReset(testPrefix)
}

test('draw service events lifecycle', async ({ page, goTest, resetScene }) => {
	goTest('^TestDrawServiceEvents$/AddTransformAndDrawing')

	await expect(page.getByText('lifecycle-box')).toBeVisible({ timeout: 10000 })
	await expect(page.getByText('lifecycle-line')).toBeVisible({ timeout: 10000 })
	await screenshotCanvas(page, 'DRAW_SERVICE_EVENTS_ADDED')

	goTest('^TestDrawServiceEvents$/UpdateTransformAndDrawing')

	await expect(page.getByText('lifecycle-box')).toBeVisible({ timeout: 10000 })
	await expect(page.getByText('lifecycle-line')).toBeVisible({ timeout: 10000 })
	await screenshotCanvas(page, 'DRAW_SERVICE_EVENTS_UPDATED')

	goTest('^TestDrawServiceEvents$/RemoveAll')

	await expect(page.getByText('No objects displayed', { exact: true })).toBeVisible({
		timeout: 15000,
	})
	await screenshotCanvas(page, 'DRAW_SERVICE_EVENTS_REMOVED')

	await resetScene()
})

test('invisible entity', async ({ page, goTest, resetScene }) => {
	goTest('^TestInvisible$/DrawVisible')

	await expect(page.getByText('invisible-box')).toBeVisible({ timeout: 10000 })
	await screenshotCanvas(page, 'INVISIBLE_ENTITY_VISIBLE')

	goTest('^TestInvisible$/DrawInvisible')

	await expect(page.getByText('invisible-box')).toBeVisible({ timeout: 10000 })
	await screenshotCanvas(page, 'INVISIBLE_ENTITY_INVISIBLE')

	await resetScene()
})

test('show axes helper', async ({ page, goTest, resetScene }) => {
	goTest('^TestShowAxesHelper$/DrawWithAxesHelper')

	await expect(page.getByText('show-axes-helper-box')).toBeVisible({ timeout: 10000 })
	await screenshotCanvas(page, 'SHOW_AXES_HELPER_WITH')

	goTest('^TestShowAxesHelper$/DrawWithoutAxesHelper')

	await expect(page.getByText('show-axes-helper-box')).toBeVisible({ timeout: 10000 })
	await screenshotCanvas(page, 'SHOW_AXES_HELPER_WITHOUT')

	await resetScene()
})

test('draw frame system', async ({ page, goTest, snapshotAndReset }) => {
	const testPrefix = 'DRAW_FRAME_SYSTEM'

	goTest('^TestDrawFrameSystem$/DrawFrameSystem')

	await expect(page.getByText('No objects displayed', { exact: true })).not.toBeVisible()

	await snapshotAndReset(testPrefix)
})

test('draw hierarchy', async ({ page, goTest, resetScene, takeScreenshot }) => {
	const testPrefix = 'DRAW_HIERARCHY'

	goTest('^TestDrawHierarchy$/DrawHierarchy')

	await expect(page.getByText('zulu', { exact: true })).toBeVisible()
	await expect(page.getByText('bravo', { exact: true })).toBeVisible()

	await page
		.locator('[data-part="branch-control"]')
		.filter({ hasText: 'zulu' })
		.locator('[data-part="branch-trigger"]')
		.click()
	await expect(page.getByText('tango', { exact: true })).toBeVisible()
	await expect(page.getByText('delta', { exact: true })).toBeVisible()

	await takeScreenshot(`${testPrefix}_ZULU_EXPANDED`)

	await page
		.locator('[data-part="branch-control"]')
		.filter({ hasText: 'tango' })
		.locator('[data-part="branch-trigger"]')
		.click()
	await expect(page.getByText('sierra', { exact: true })).toBeVisible()
	await expect(page.getByText('foxtrot', { exact: true })).toBeVisible()

	await takeScreenshot(`${testPrefix}_TANGO_EXPANDED`)

	await resetScene()
})

test('draw frames', async ({ page, goTest, snapshotAndReset }) => {
	const testPrefix = 'DRAW_FRAMES'

	goTest('^TestDrawFrames$/DrawFrames')

	await expect(page.getByText('DrawFrames Axes')).toBeVisible()
	await expect(page.getByText('DrawFrames Sphere')).toBeVisible()
	await expect(page.getByText('DrawFrames Capsule:Capsule')).toBeVisible()

	await snapshotAndReset(testPrefix)
})

test('draw geometries', async ({ page, goTest, snapshotAndReset }) => {
	const testPrefix = 'DRAW_GEOMETRIES'

	goTest('^TestDrawGeometries$/DrawGeometries')

	await expect(page.getByText('DrawGeometries Box')).toBeVisible()
	await expect(page.getByText('DrawGeometries Sphere')).toBeVisible()
	await expect(page.getByText('DrawGeometries Capsule')).toBeVisible()
	await expect(page.getByText('DrawGeometries Mesh')).toBeVisible()
	await expect(page.getByText('DrawGeometries PointCloud')).toBeVisible()

	await snapshotAndReset(testPrefix)
})

test('draw geometry', async ({ page, goTest, snapshotAndReset }) => {
	const testPrefix = 'DRAW_GEOMETRY'

	goTest(
		'"^TestDrawGeometry$/(DrawGeometry_box|DrawGeometry_sphere|DrawGeometry_capsule|DrawGeometry_mesh)"'
	)

	await expect(page.getByText('DrawGeometry box')).toBeVisible()
	await expect(page.getByText('DrawGeometry sphere')).toBeVisible()
	await expect(page.getByText('DrawGeometry capsule')).toBeVisible()
	await expect(page.getByText('DrawGeometry mesh')).toBeVisible()

	await snapshotAndReset(testPrefix)
})

test('draw geometry updating', async ({ page, goTest, snapshotAndReset }) => {
	const testPrefix = 'DRAW_GEOMETRY_UPDATING'

	goTest('"^TestDrawGeometry$/DrawGeometry_updating"')

	await expect(page.getByText('DrawGeometry box updating')).toBeVisible()

	await snapshotAndReset(testPrefix)
})

test('draw point cloud', async ({ page, goTest, snapshotAndReset }) => {
	const testPrefix = 'DRAW_POINT_CLOUD'

	goTest('^TestDrawPointCloud$/DrawPointClouds')

	await expect(page.getByText('octagon')).toBeVisible()
	await expect(page.getByText('Zaghetto')).toBeVisible()
	await expect(page.getByText('simple')).toBeVisible()
	await expect(page.getByText('boat')).toBeVisible()

	await snapshotAndReset(testPrefix)
})

test('draw point cloud updating', async ({ page, goTest, snapshotAndReset }) => {
	const testPrefix = 'DRAW_POINT_CLOUD_UPDATING'

	goTest('^TestDrawPointCloudUpdating$/DrawPointCloudUpdating')

	await expect(page.getByText('DrawPointCloud updating')).toBeVisible()

	await snapshotAndReset(testPrefix)
})

test('draw point cloud in chunks', async ({ page, goTestAsync, snapshotAndReset }) => {
	await runChunkedTest(
		{ page, goTestAsync, snapshotAndReset },
		'DRAW_POINT_CLOUD_IN_CHUNKS',
		'^TestDrawPointCloud$/^DrawPointCloudInChunks$'
	)
})

test('draw point cloud in chunks with palette', async ({ page, goTestAsync, snapshotAndReset }) => {
	await runChunkedTest(
		{ page, goTestAsync, snapshotAndReset },
		'DRAW_POINT_CLOUD_IN_CHUNKS_WITH_PALETTE',
		'^TestDrawPointCloud$/DrawPointCloudInChunksWithPalette'
	)
})

test('draw point cloud in chunks with per point colors', async ({
	page,
	goTestAsync,
	snapshotAndReset,
}) => {
	await runChunkedTest(
		{ page, goTestAsync, snapshotAndReset },
		'DRAW_POINT_CLOUD_IN_CHUNKS_WITH_PER_POINT_COLORS',
		'^TestDrawPointCloud$/DrawPointCloudInChunksWithPerPointColors'
	)
})

test('draw point cloud in chunks with uniform opacity', async ({
	page,
	goTestAsync,
	snapshotAndReset,
}) => {
	await runChunkedTest(
		{ page, goTestAsync, snapshotAndReset },
		'DRAW_POINT_CLOUD_IN_CHUNKS_WITH_UNIFORM_OPACITY',
		'^TestDrawPointCloud$/DrawPointCloudInChunksWithUniformOpacity'
	)
})

test('chunked point cloud survives a reconnect', async ({ page, goTest, snapshotAndReset }) => {
	const testPrefix = 'CHUNKED_POINT_CLOUD_RECONNECT'

	// The small chunked cloud on purpose: this test loads one twice, and the
	// multi-million point fixtures are too slow to do that inside the timeout.
	// Several chunks with per-point colors is all the coverage needs.
	goTest('^TestDrawPointCloud$/DrawSmallChunkedPointCloud')

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
	await snapshotAndReset(testPrefix)
})

test('draw geometries updating', async ({ page, goTest, snapshotAndReset }) => {
	const testPrefix = 'DRAW_GEOMETRIES_UPDATING'

	goTest('^TestDrawGeometriesUpdating$/DrawGeometriesUpdating')

	await expect(page.getByText('DrawGeometries box1 updating')).toBeVisible()
	await expect(page.getByText('DrawGeometries box2 updating')).toBeVisible()
	await expect(page.getByText('DrawGeometries box3 updating')).toBeVisible()

	await snapshotAndReset(testPrefix)
})

test('draw world state', async ({ page, goTest, snapshotAndReset }) => {
	const testPrefix = 'DRAW_WORLD_STATE'

	goTest('^TestDrawWorldState$/DrawWorldState')

	await expect(page.getByText('box0')).toBeVisible()
	await expect(page.getByText('box1')).toBeVisible()
	await expect(page.getByText('box2')).toBeVisible()

	await snapshotAndReset(testPrefix)
})

test('draw nurbs', async ({ page, goTest, snapshotAndReset }) => {
	const testPrefix = 'DRAW_NURBS'

	goTest('^TestDrawNurbs$/DrawNurbs')

	await expect(page.getByText('nurbs-1')).toBeVisible()

	await snapshotAndReset(testPrefix)
})

test('draw lines', async ({ page, goTest, snapshotAndReset }) => {
	const testPrefix = 'DRAW_LINE'

	goTest('^TestDrawLine$/DrawLine$')

	await expect(page.getByText('upwardSpiral')).toBeVisible()

	await snapshotAndReset(testPrefix)
})

test('draw lines with line color', async ({ page, goTest, snapshotAndReset }) => {
	const testPrefix = 'DRAW_LINE_WITH_LINE_COLOR'

	goTest('^TestDrawLine$/DrawLineWithLineColor$')

	await expect(page.getByText('upwardSpiralLineColor')).toBeVisible()

	await snapshotAndReset(testPrefix)
})

test('draw lines with dot color', async ({ page, goTest, snapshotAndReset }) => {
	const testPrefix = 'DRAW_LINE_WITH_DOT_COLOR'

	goTest('^TestDrawLine$/DrawLineWithDotColor$')

	await expect(page.getByText('upwardSpiralDotColor')).toBeVisible()

	await snapshotAndReset(testPrefix)
})

test('draw lines with line width', async ({ page, goTest, snapshotAndReset }) => {
	const testPrefix = 'DRAW_LINE_WITH_LINE_WIDTH'

	goTest('^TestDrawLine$/DrawLineWithLineWidth$')

	await expect(page.getByText('upwardSpiralLineWidth')).toBeVisible()

	await snapshotAndReset(testPrefix)
})

test('draw lines with dot size', async ({ page, goTest, snapshotAndReset }) => {
	const testPrefix = 'DRAW_LINE_WITH_DOT_SIZE'

	goTest('^TestDrawLine$/DrawLineWithDotSize$')

	await expect(page.getByText('upwardSpiralDotSize')).toBeVisible()

	await snapshotAndReset(testPrefix)
})

test('draw lines with line color palette', async ({ page, goTest, snapshotAndReset }) => {
	const testPrefix = 'DRAW_LINE_WITH_LINE_COLOR_PALETTE'

	goTest('^TestDrawLine$/DrawLineWithLineColorPalette$')

	await expect(page.getByText('upwardSpiralLineColorPalette')).toBeVisible()

	await snapshotAndReset(testPrefix)
})

test('draw lines with per-line colors', async ({ page, goTest, snapshotAndReset }) => {
	const testPrefix = 'DRAW_LINE_WITH_PER_LINE_COLORS'

	goTest('^TestDrawLine$/DrawLineWithPerLineColors$')

	await expect(page.getByText('upwardSpiralPerLineColors')).toBeVisible()

	await snapshotAndReset(testPrefix)
})

test('draw lines with dot color palette', async ({ page, goTest, snapshotAndReset }) => {
	const testPrefix = 'DRAW_LINE_WITH_DOT_COLOR_PALETTE'

	goTest('^TestDrawLine$/DrawLineWithDotColorPalette$')

	await expect(page.getByText('upwardSpiralDotColorPalette')).toBeVisible()

	await snapshotAndReset(testPrefix)
})

test('draw lines with per-dot colors', async ({ page, goTest, snapshotAndReset }) => {
	const testPrefix = 'DRAW_LINE_WITH_PER_DOT_COLORS'

	goTest('^TestDrawLine$/DrawLineWithPerDotColors$')

	await expect(page.getByText('upwardSpiralPerDotColors')).toBeVisible()

	await snapshotAndReset(testPrefix)
})

test('draw points', async ({ page, goTest, snapshotAndReset }) => {
	const testPrefix = 'DRAW_POINTS'

	goTest('^TestDrawPoints$/DrawPoints$')

	await expect(page.getByText('myPoints')).toBeVisible()

	await snapshotAndReset(testPrefix)
})

test('draw points with single color', async ({ page, goTest, snapshotAndReset }) => {
	const testPrefix = 'DRAW_POINTS_WITH_SINGLE_COLOR'

	goTest('^TestDrawPoints$/DrawPointsWithSingleColor$')

	await expect(page.getByText('myPointsSingleColor')).toBeVisible()

	await snapshotAndReset(testPrefix)
})

test('draw points with color palette', async ({ page, goTest, snapshotAndReset }) => {
	const testPrefix = 'DRAW_POINTS_WITH_COLOR_PALETTE'

	goTest('^TestDrawPoints$/DrawPointsWithColorPalette$')

	await expect(page.getByText('myPointsPalette')).toBeVisible()

	await snapshotAndReset(testPrefix)
})

test('draw points with per point color', async ({ page, goTest, snapshotAndReset }) => {
	const testPrefix = 'DRAW_POINTS_WITH_PER_POINT_COLOR'

	goTest('^TestDrawPoints$/DrawPointsWithPerPointColors$')

	await expect(page.getByText('myPointsPerPoint')).toBeVisible()

	await snapshotAndReset(testPrefix)
})

test('draw points with point size', async ({ page, goTest, snapshotAndReset }) => {
	const testPrefix = 'DRAW_POINTS_WITH_POINT_SIZE'

	goTest('^TestDrawPoints$/DrawPointsWithPointSize$')

	await expect(page.getByText('myPointsWithSize')).toBeVisible()

	await snapshotAndReset(testPrefix)
})

test('draw points in chunks', async ({ page, goTestAsync, snapshotAndReset }) => {
	await runChunkedTest(
		{ page, goTestAsync, snapshotAndReset },
		'DRAW_POINTS_IN_CHUNKS',
		'^TestDrawPoints$/DrawPointsInChunks'
	)
})

test('draw poses as arrows', async ({ page, goTest, snapshotAndReset }) => {
	const testPrefix = 'DRAW_POSES_AS_ARROWS'

	goTest('^TestDrawPosesAsArrows$/DrawPosesAsArrows$')

	await expect(page.getByText('mySpherePoses', { exact: true })).toBeVisible()
	await expect(page.getByText('mySphere', { exact: true })).toBeVisible()

	await snapshotAndReset(testPrefix)
})

const drawArrowsUpdateStep = (goTest: GoTest, step: 'Start' | 'Move' | 'MoveAgain') => {
	goTest(`'^TestDrawPosesAsArrowsUpdating$/^${step}$'`)
}

test('draw poses as arrows updating', async ({ page, goTest, resetScene }) => {
	const testPrefix = 'DRAW_POSES_AS_ARROWS_UPDATING'

	drawArrowsUpdateStep(goTest, 'Start')
	await expect(page.getByText('DrawPosesAsArrows updating')).toBeVisible({ timeout: 10000 })
	await page.waitForTimeout(1000)
	const initial = await captureCanvas(page)
	await screenshotCanvas(page, `${testPrefix}_0_START`)

	drawArrowsUpdateStep(goTest, 'Move')
	const moved = await waitForCanvasToChange(page, initial)
	expect(moved, 'arrows did not move on the first same-UUID redraw').not.toBeNull()
	await screenshotCanvas(page, `${testPrefix}_1_MOVED`)

	drawArrowsUpdateStep(goTest, 'MoveAgain')
	const movedAgain = await waitForCanvasToChange(page, moved ?? initial)
	expect(movedAgain, 'arrows did not move on the second same-UUID redraw').not.toBeNull()
	await screenshotCanvas(page, `${testPrefix}_2_MOVED_AGAIN`)

	await resetScene()
})

test('draw poses as arrows with color palette', async ({ page, goTest, snapshotAndReset }) => {
	const testPrefix = 'DRAW_POSES_AS_ARROWS_WITH_COLOR_PALETTE'

	goTest('^TestDrawPosesAsArrows$/DrawPosesAsArrowsWithColorPalette$')

	await expect(page.getByText('mySpherePoses', { exact: true })).toBeVisible()
	await expect(page.getByText('mySphere', { exact: true })).toBeVisible()

	await snapshotAndReset(testPrefix)
})

test('draw poses as arrows with single color', async ({ page, goTest, snapshotAndReset }) => {
	const testPrefix = 'DRAW_POSES_AS_ARROWS_WITH_SINGLE_COLOR'

	goTest('^TestDrawPosesAsArrows$/DrawPosesAsArrowsWithSingleColor$')

	await expect(page.getByText('mySpherePoses', { exact: true })).toBeVisible()
	await expect(page.getByText('mySphere', { exact: true })).toBeVisible()

	await snapshotAndReset(testPrefix)
})

test('draw poses as arrows with per point color', async ({ page, goTest, snapshotAndReset }) => {
	const testPrefix = 'DRAW_POSES_AS_ARROWS_WITH_PER_POINT_COLOR'

	goTest('^TestDrawPosesAsArrows$/DrawPosesAsArrowsWithPerPointColors$')

	await expect(page.getByText('mySpherePoses', { exact: true })).toBeVisible()
	await expect(page.getByText('mySphere', { exact: true })).toBeVisible()

	await snapshotAndReset(testPrefix)
})

test('draw gltf', async ({ page, goTest, snapshotAndReset }) => {
	const testPrefix = 'DRAW_GLTF'

	goTest('^TestDrawGLTF$/^DrawGLTF$')

	await expect(page.getByText('flamingo', { exact: true })).toBeVisible()

	await snapshotAndReset(testPrefix)
})

test('draw point clouds', async ({ page, goTest, snapshotAndReset }) => {
	const testPrefix = 'DRAW_POINT_CLOUDS'

	goTest('^TestDrawPointCloud$/DrawPointClouds')

	await page.getByText('octagon').waitFor({ state: 'visible' })
	await page.getByText('Zaghetto').waitFor({ state: 'visible' })
	await page.getByText('simple').waitFor({ state: 'visible' })
	await page.getByText('boat').waitFor({ state: 'visible' })

	await snapshotAndReset(testPrefix)
})

test('draw point clouds with downscaling', async ({ page, goTest, snapshotAndReset }) => {
	const testPrefix = 'DRAW_POINT_CLOUDS_WITH_DOWNSCALING'

	goTest('^TestDrawPointCloud$/DrawPointCloudWithDownscaling')

	await expect(page.getByText('boat_downscaled')).toBeVisible()

	await snapshotAndReset(testPrefix)
})

test('draw point clouds with single color', async ({ page, goTest, snapshotAndReset }) => {
	const testPrefix = 'DRAW_POINT_CLOUDS_WITH_SINGLE_COLOR'

	goTest('^TestDrawPointCloud$/DrawSingleColorPointCloud')

	await expect(page.getByText('octagon_single_color')).toBeVisible()

	await snapshotAndReset(testPrefix)
})

test('draw point cloud with opacity', async ({ page, goTest, snapshotAndReset }) => {
	const testPrefix = 'DRAW_POINT_CLOUD_WITH_OPACITY'

	goTest('^TestDrawPointCloud$/DrawSingleColorPointCloudWithOpacity')

	await expect(page.getByText('octagon_with_opacity')).toBeVisible()

	await snapshotAndReset(testPrefix)
})

test('draw point clouds with color palette', async ({ page, goTest, snapshotAndReset }) => {
	const testPrefix = 'DRAW_POINT_CLOUDS_WITH_COLOR_PALETTE'

	goTest('^TestDrawPointCloud$/DrawPaletteColorPointCloud')

	await expect(page.getByText('Zaghetto_palette')).toBeVisible()

	await snapshotAndReset(testPrefix)
})

test('draw point clouds with per point color', async ({ page, goTest, snapshotAndReset }) => {
	const testPrefix = 'DRAW_POINT_CLOUDS_WITH_PER_POINT_COLOR'

	goTest('^TestDrawPointCloud$/DrawPerPointColorPointCloud')

	await expect(page.getByText('simple_per_point')).toBeVisible()

	await snapshotAndReset(testPrefix)
})

test('set camera pose', async ({ page, goTest, resetScene }) => {
	const testPrefix = 'SET_CAMERA_POSE'

	goTest('^TestSetCamera$/SetCameraTopDown')

	await expect(page.getByText('reference_box')).toBeVisible()

	await screenshotCanvas(page, `${testPrefix}_SET_CAMERA`)

	goTest('^TestSetCamera$/ResetCamera')

	await screenshotCanvas(page, `${testPrefix}_RESET_CAMERA`)

	await resetScene()
})

test('remove all', async ({ page, goTest, resetScene }) => {
	const testPrefix = 'REMOVE_ALL'

	goTest('^TestRemoveAll$/RemoveAllSetup')

	await expect(page.getByText('box2delete')).toBeVisible({ timeout: 10000 })
	await screenshotCanvas(page, `${testPrefix}_SETUP`)

	goTest('^TestRemoveAll$/RemoveAll')

	await expect(page.getByText('box2delete')).not.toBeVisible({ timeout: 10000 })
	await screenshotCanvas(page, testPrefix)

	await resetScene()
})

test('remove drawings', async ({ page, goTest, resetScene }) => {
	const testPrefix = 'REMOVE_DRAWINGS'

	goTest('^TestRemoveDrawings$/RemoveDrawingsSetup')

	await expect(page.getByText('box2delete')).toBeVisible({ timeout: 10000 })
	await screenshotCanvas(page, `${testPrefix}_SETUP`)

	goTest('^TestRemoveDrawings$/RemoveDrawings')

	await expect(page.getByText('box2delete')).toBeVisible({ timeout: 10000 })
	await screenshotCanvas(page, testPrefix)

	await resetScene()
})

test('remove transforms', async ({ page, goTest, resetScene }) => {
	const testPrefix = 'REMOVE_TRANSFORMS'

	goTest('^TestRemoveTransforms$/RemoveTransformsSetup')

	await expect(page.getByText('box2delete')).toBeVisible({ timeout: 10000 })
	await screenshotCanvas(page, `${testPrefix}_SETUP`)

	goTest('^TestRemoveTransforms$/RemoveTransforms')

	await expect(page.getByText('box2delete')).not.toBeVisible({ timeout: 10000 })
	await screenshotCanvas(page, testPrefix)

	await resetScene()
})

test('replay', async ({ page, goTest, resetScene }) => {
	const testPrefix = 'REPLAY'

	goTest('^TestReplay$/ReplayRecord')

	await expect(page.getByText('bouncing_ball')).toBeVisible()

	await screenshotCanvas(page, `${testPrefix}_RECORD`)

	await resetScene()

	goTest('^TestReplay$/ReplayPlayback')

	await expect(page.getByText('bouncing_ball')).toBeVisible()

	await screenshotCanvas(page, `${testPrefix}_PLAYBACK`)

	await resetScene()
})

interface RedrawRun {
	page: Page
	goTest: GoTest
	snapshotAndReset: (testPrefix: string) => Promise<void>
}

const runRedrawLoop = async (
	{ page, goTest, snapshotAndReset }: RedrawRun,
	testPrefix: string,
	step: string
) => {
	goTest(`^TestRedrawLoop$/${step}$`)

	await expect(page.getByText('redraw-box-00', { exact: true })).toBeVisible({ timeout: 10000 })

	// The tree is virtualized, so counting rows proves nothing. The canvas is the
	// assertion: the boxes are a 6x4 grid in a fixed palette, so a lost change reads
	// as a hole and a misapplied one as a wrong-colored cell.
	await waitForCanvasToSettle(page)
	await snapshotAndReset(testPrefix)
}

/**
 * The reported failure: a producer clearing the scene and redrawing it every tick.
 *
 * Both tests below draw the identical grid and must produce the identical image. The first clears
 * before each redraw, the second does not, and the point is that the visualizer converges to the
 * same scene either way. Before this fix the clearing variant lost entities: a removal and the
 * re-add that followed it could land in the same animation frame, where the re-add was discarded.
 */
test('redraw loop clearing and redrawing', async ({ page, goTest, snapshotAndReset }) => {
	await runRedrawLoop({ page, goTest, snapshotAndReset }, 'REDRAW_LOOP_WITH_CLEAR', 'RedrawLoop')
})

// The pattern we recommend instead: identities are deterministic, so redrawing upserts in place
// and the service never publishes a removal at all.
test('redraw loop without clearing', async ({ page, goTest, snapshotAndReset }) => {
	await runRedrawLoop(
		{ page, goTest, snapshotAndReset },
		'REDRAW_LOOP_NO_CLEAR',
		'RedrawWithoutClearing'
	)
})

test('update entity partial updates', async ({ page, goTest, resetScene }) => {
	const testPrefix = 'UPDATE_ENTITY'

	goTest('^TestUpdateEntity$/Setup$')

	await expect(page.getByText('update-entity box')).toBeVisible({ timeout: 10000 })
	await expect(page.getByText('update-entity points')).toBeVisible({ timeout: 10000 })
	const initial = await waitForCanvasToSettle(page)
	await screenshotCanvas(page, `${testPrefix}_0_SETUP`)

	// Each step screenshots after the canvas settles, not at the first changed pixel.
	// A mesh and its axes helper are flushed by separate batched renderers, so the
	// first differing frame can show the box moved with its helper still behind.
	const applyStep = async (step: string, reference: Buffer, description: string) => {
		goTest(`^TestUpdateEntity$/${step}$`)

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

	await resetScene()
})

test('remove entity', async ({ page, goTest, resetScene }) => {
	const testPrefix = 'REMOVE_ENTITY'

	goTest('^TestRemoveEntity$/Setup$')

	await expect(page.getByText('remove-entity keep')).toBeVisible({ timeout: 10000 })
	await expect(page.getByText('remove-entity drop')).toBeVisible({ timeout: 10000 })
	await screenshotCanvas(page, `${testPrefix}_SETUP`)

	goTest('^TestRemoveEntity$/RemoveOne$')

	// Only the targeted entity goes. The rest of the scene is untouched.
	await expect(page.getByText('remove-entity drop')).not.toBeVisible({ timeout: 10000 })
	await expect(page.getByText('remove-entity keep')).toBeVisible()
	await screenshotCanvas(page, testPrefix)

	await resetScene()
})

test('relationships', async ({ page, goTest, resetScene, takeScreenshot }) => {
	goTest('^TestRelationships$/Setup')

	await expect(page.getByText('rel-source', { exact: true })).toBeVisible({ timeout: 10000 })
	await expect(page.getByText('rel-target', { exact: true })).toBeVisible({ timeout: 10000 })

	goTest('^TestRelationships$/CreateRelationship')

	await page.getByText('rel-source', { exact: true }).click()
	await expect(page.getByText('rel-target (HoverLink)')).toBeVisible({ timeout: 10000 })
	await takeScreenshot('RELATIONSHIPS_CREATED')

	// TODO(relationships): reload-persistence is not checked here. StreamEntityChanges
	// replays entities to a reconnecting client but not relationships, so a HoverLink
	// is lost on reload. Re-enable once relationships survive a reload.

	goTest('^TestRelationships$/DeleteRelationship')

	await expect(page.getByText('rel-target (HoverLink)')).not.toBeVisible({ timeout: 10000 })
	await takeScreenshot('RELATIONSHIPS_DELETED')

	await resetScene()
})
