package api

import (
	"fmt"
	"testing"

	"github.com/golang/geo/r3"
	"go.viam.com/rdk/referenceframe"
	"go.viam.com/rdk/spatialmath"
	"go.viam.com/test"

	"github.com/viam-labs/motion-tools/draw"
)

// The boxes form a 6x4 grid so a dropped entity shows up as a hole in the rendered scene.
// Volume-wise this is well short of what it takes to overflow a subscriber; the burst case is
// covered server-side by TestDrawService_NoChangesLostUnderBurst. What this exercises is the
// browser reconciling a clear against the redraw that immediately follows it, which goes wrong
// at any size if the two land in the same animation frame.
const (
	redrawLoopColumns  = 6
	redrawLoopRows     = 4
	redrawLoopBoxCount = redrawLoopColumns * redrawLoopRows
	redrawLoopSpacing  = 150.0
)

const redrawLoopID = "redraw-loop"

func redrawLoopGeometries(t *testing.T) *referenceframe.GeometriesInFrame {
	t.Helper()

	dims := r3.Vector{X: 80, Y: 80, Z: 80}
	geometries := make([]spatialmath.Geometry, 0, redrawLoopBoxCount)
	for i := range redrawLoopBoxCount {
		pose := spatialmath.NewPoseFromPoint(r3.Vector{
			X: float64(i%redrawLoopColumns) * redrawLoopSpacing,
			Y: float64(i/redrawLoopColumns) * redrawLoopSpacing,
		})
		box, err := spatialmath.NewBox(pose, dims, fmt.Sprintf("redraw-box-%02d", i))
		test.That(t, err, test.ShouldBeNil)
		geometries = append(geometries, box)
	}

	return referenceframe.NewGeometriesInFrame(referenceframe.World, geometries)
}

// A palette rather than one flat color, so a box drawn at the wrong index is visible too.
func redrawLoopColors() []draw.Color {
	return []draw.Color{
		draw.ColorFromName("red"),
		draw.ColorFromName("orange"),
		draw.ColorFromName("yellow"),
		draw.ColorFromName("green"),
		draw.ColorFromName("blue"),
		draw.ColorFromName("magenta"),
	}
}

// TestRedrawLoop reproduces the reported failure: a producer that clears the scene and redraws
// it on every tick. Identities are stable across iterations, so the scene should end up exactly
// as it started, with every entity present.
func TestRedrawLoop(t *testing.T) {
	startTestServer(t)
	defer stopTestServer()

	t.Run("RedrawLoop", func(t *testing.T) {
		geometries := redrawLoopGeometries(t)

		for range 5 {
			_, err := RemoveAll()
			test.That(t, err, test.ShouldBeNil)

			uuids, err := DrawGeometriesInFrame(DrawGeometriesInFrameOptions{
				ID:         redrawLoopID,
				Geometries: geometries,
				Colors:     redrawLoopColors(),
			})
			test.That(t, err, test.ShouldBeNil)
			test.That(t, uuids, test.ShouldHaveLength, redrawLoopBoxCount)
		}
	})

	// The same loop without the clear. This is the pattern we recommend: identities are
	// deterministic, so redrawing upserts in place and the service never sees a removal.
	t.Run("RedrawWithoutClearing", func(t *testing.T) {
		geometries := redrawLoopGeometries(t)

		for range 5 {
			uuids, err := DrawGeometriesInFrame(DrawGeometriesInFrameOptions{
				ID:         redrawLoopID,
				Geometries: geometries,
				Colors:     redrawLoopColors(),
			})
			test.That(t, err, test.ShouldBeNil)
			test.That(t, uuids, test.ShouldHaveLength, redrawLoopBoxCount)
		}
	})
}
