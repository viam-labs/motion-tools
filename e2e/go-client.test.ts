import { expect, type Page, test } from '@playwright/test'
import { execSync } from 'node:child_process'

import { openScene } from './helpers/openScene'
import { screenshotCanvas } from './helpers/screenshot'

const takeScreenshot = (page: Page, testPrefix: string): Promise<void> =>
	expect.soft(page).toHaveScreenshot(`${testPrefix}.png`, { fullPage: true })

const cleanup = async (page: Page) => {
	execSync(
		'go test -run ^TestRemoveAllSpatialObjects$/RemoveAllSpatialObjects github.com/viam-labs/motion-tools/client/client -count=1',
		{
			encoding: 'utf8',
		}
	)

	await expect(page.getByText('No objects displayed', { exact: true })).toBeVisible({
		timeout: 15000,
	})
}

const snapshotAndReset = async (page: Page, testPrefix: string) => {
	await screenshotCanvas(page, testPrefix)
	await cleanup(page)
}

test('draw frame system', async ({ browser }) => {
	const testPrefix = 'DRAW_FRAME_SYSTEM'
	const page = await openScene(browser)

	execSync(
		'go test -run ^TestDrawFrameSystem$/DrawFrameSystem github.com/viam-labs/motion-tools/client/client -count=1',
		{
			encoding: 'utf8',
		}
	)

	await snapshotAndReset(page, testPrefix)
})

test('draw hierarchy', async ({ browser }) => {
	const testPrefix = 'DRAW_HIERARCHY'
	const page = await openScene(browser)

	execSync(
		'go test -run ^TestDrawHierarchy$/DrawHierarchy github.com/viam-labs/motion-tools/client/client -count=1',
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
		'go test -run ^TestDrawFrames$/DrawFrames github.com/viam-labs/motion-tools/client/client -count=1',
		{
			encoding: 'utf8',
		}
	)

	await snapshotAndReset(page, testPrefix)
})

test('draw geometries', async ({ browser }) => {
	const testPrefix = 'DRAW_GEOMETRIES'
	const page = await openScene(browser)

	execSync(
		'go test -run ^TestDrawGeometries$/DrawGeometries github.com/viam-labs/motion-tools/client/client -count=1',
		{
			encoding: 'utf8',
		}
	)

	await snapshotAndReset(page, testPrefix)
})

test('draw geometries updating', async ({ browser }) => {
	const testPrefix = 'DRAW_GEOMETRIES_UPDATING'
	const page = await openScene(browser)

	execSync(
		'go test -run ^TestDrawGeometriesUpdating$/DrawGeometriesUpdating github.com/viam-labs/motion-tools/client/client -count=1',
		{
			encoding: 'utf8',
		}
	)

	await snapshotAndReset(page, testPrefix)
})

test('draw gltf', async ({ browser }) => {
	const testPrefix = 'DRAW_GLTF'
	const page = await openScene(browser)

	execSync(
		'go test -run ^TestDrawGLTF$/DrawGLTF github.com/viam-labs/motion-tools/client/client -count=1',
		{
			encoding: 'utf8',
		}
	)

	await expect(page.getByLabel('World').getByText('Scene')).toBeVisible({ timeout: 10000 })

	await snapshotAndReset(page, testPrefix)
})

test('draw lines', async ({ browser }) => {
	const testPrefix = 'DRAW_LINES'
	const page = await openScene(browser)

	execSync(
		'go test -run ^TestDrawLines$/DrawLine github.com/viam-labs/motion-tools/client/client -count=1',
		{
			encoding: 'utf8',
		}
	)

	await snapshotAndReset(page, testPrefix)
})

test('draw point cloud', async ({ browser }) => {
	const testPrefix = 'DRAW_POINT_CLOUD'
	const page = await openScene(browser)

	execSync(
		'go test -run ^TestDrawPointCloud$/DrawPointCloud github.com/viam-labs/motion-tools/client/client -count=1',
		{
			encoding: 'utf8',
		}
	)

	await expect(page.getByText('Zaghetto10', { exact: true })).toBeVisible({ timeout: 10000 })

	await snapshotAndReset(page, testPrefix)
})

test('draw points', async ({ browser }) => {
	const testPrefix = 'DRAW_POINTS'
	const page = await openScene(browser)

	execSync(
		'go test -run ^TestDrawPoints$/DrawPoints github.com/viam-labs/motion-tools/client/client -count=1',
		{
			encoding: 'utf8',
		}
	)

	await snapshotAndReset(page, testPrefix)
})

test('draw poses', async ({ browser }) => {
	const testPrefix = 'DRAW_POSES'
	const page = await openScene(browser)

	execSync(
		'go test -run ^TestDrawPoses$/DrawPoses$ github.com/viam-labs/motion-tools/client/client -count=1',
		{
			encoding: 'utf8',
		}
	)

	await snapshotAndReset(page, testPrefix)
})

test('draw poses with color palette', async ({ browser }) => {
	const testPrefix = 'DRAW_POSES_WITH_COLOR_PALETTE'
	const page = await openScene(browser)

	execSync(
		'go test -run ^TestDrawPoses$/DrawAlternatingColorsPoses$ github.com/viam-labs/motion-tools/client/client -count=1',
		{
			encoding: 'utf8',
		}
	)

	await snapshotAndReset(page, testPrefix)
})

test('draw poses with single color', async ({ browser }) => {
	const testPrefix = 'DRAW_POSES_WITH_SINGLE_COLOR'
	const page = await openScene(browser)

	execSync(
		'go test -run ^TestDrawPoses$/DrawSingleColorPoses$ github.com/viam-labs/motion-tools/client/client -count=1',
		{
			encoding: 'utf8',
		}
	)

	await snapshotAndReset(page, testPrefix)
})

test('draw world state', async ({ browser }) => {
	const testPrefix = 'DRAW_WORLD_STATE'
	const page = await openScene(browser)

	execSync(
		'go test -run ^TestDrawWorldState$/DrawWorldState github.com/viam-labs/motion-tools/client/client -count=1',
		{
			encoding: 'utf8',
		}
	)

	await snapshotAndReset(page, testPrefix)
})

test('remove spatial objects', async ({ browser }) => {
	const testPrefix = 'REMOVE_SPATIAL_OBJECTS'
	const page = await openScene(browser)

	execSync(
		'go test -run ^TestRemoveSpatialObjects$/RemoveSpatialObjects github.com/viam-labs/motion-tools/client/client -count=1',
		{
			encoding: 'utf8',
		}
	)

	await snapshotAndReset(page, testPrefix)
})

test('set camera pose', async ({ browser }) => {
	const testPrefix = 'SET_CAMERA_POSE'
	const page = await openScene(browser)

	execSync(
		'go test -run ^TestSetCameraPose$/SetCameraPose github.com/viam-labs/motion-tools/client/client -count=1',
		{
			encoding: 'utf8',
		}
	)

	await snapshotAndReset(page, testPrefix)
})
