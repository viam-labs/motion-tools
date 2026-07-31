package api

import (
	"testing"

	"github.com/golang/geo/r3"
	"go.viam.com/rdk/spatialmath"
	"go.viam.com/test"

	"github.com/viam-labs/motion-tools/draw"
)

const (
	updateBoxID  = "update-entity-box"
	updateLineID = "update-entity-line"
)

// Each e2e step runs as its own `go test` process, so a UUID cannot be carried over in memory.
// draw.WithID derives it deterministically from the string instead, which is the same identity
// the Draw* call assigned.
func derivedUUID(id string) []byte {
	return draw.NewDrawConfig(id, draw.WithID(id)).UUID
}

func TestUpdateEntity(t *testing.T) {
	startTestServer(t)
	defer stopTestServer()

	t.Run("Setup", func(t *testing.T) {
		box, err := spatialmath.NewBox(
			spatialmath.NewZeroPose(),
			r3.Vector{X: 100, Y: 100, Z: 100},
			"update-entity box",
		)
		test.That(t, err, test.ShouldBeNil)

		_, err = DrawGeometry(DrawGeometryOptions{
			ID:       updateBoxID,
			Name:     "update-entity box",
			Geometry: box,
			Color:    draw.ColorFromName("blue"),
		})
		test.That(t, err, test.ShouldBeNil)

		// A dense slab of large points, so a color change is unmistakable in a screenshot.
		positions := make([]r3.Vector, 0, 64)
		for i := range 64 {
			positions = append(positions, r3.Vector{
				X: float64(i%8) * 60,
				Y: 400,
				Z: float64(i/8) * 60,
			})
		}

		_, err = DrawPoints(DrawPointsOptions{
			ID:        updateLineID,
			Name:      "update-entity points",
			Positions: positions,
			Colors:    []draw.Color{draw.ColorFromName("green")},
			PointSize: 40,
		})
		test.That(t, err, test.ShouldBeNil)
	})

	// Only the pose is sent; the geometry and color the entity was drawn with stay put.
	t.Run("MoveTransform", func(t *testing.T) {
		err := UpdateTransform(UpdateTransformOptions{
			UUID: derivedUUID(updateBoxID),
			Update: draw.TransformUpdate{
				Pose: spatialmath.NewPoseFromPoint(r3.Vector{X: 500, Y: 0, Z: 300}),
			},
		})
		test.That(t, err, test.ShouldBeNil)
	})

	// Only the metadata is sent, so the box recolors without its pose or geometry being resent.
	// It must stay where MoveTransform put it.
	t.Run("RecolorTransform", func(t *testing.T) {
		metadata := draw.NewMetadata(draw.WithMetadataColors(draw.ColorFromName("red")))
		err := UpdateTransform(UpdateTransformOptions{
			UUID:   derivedUUID(updateBoxID),
			Update: draw.TransformUpdate{Metadata: &metadata},
		})
		test.That(t, err, test.ShouldBeNil)
	})

	// The same for a drawing, where the saving is larger: the points recolor without their
	// positions being resent.
	t.Run("RecolorDrawing", func(t *testing.T) {
		metadata := draw.NewMetadata(draw.WithMetadataColors(draw.ColorFromName("magenta")))
		err := UpdateDrawing(UpdateDrawingOptions{
			UUID:   derivedUUID(updateLineID),
			Update: draw.DrawingUpdate{Metadata: &metadata},
		})
		test.That(t, err, test.ShouldBeNil)
	})

	t.Run("EmptyUpdateIsRejected", func(t *testing.T) {
		err := UpdateTransform(UpdateTransformOptions{UUID: derivedUUID(updateBoxID)})
		test.That(t, err, test.ShouldNotBeNil)

		err = UpdateEntity(UpdateEntityOptions{Update: draw.TransformUpdate{}})
		test.That(t, err, test.ShouldNotBeNil)
	})
}

func TestRemoveEntity(t *testing.T) {
	startTestServer(t)
	defer stopTestServer()

	const keepID = "remove-entity-keep"
	const dropID = "remove-entity-drop"

	drawBox := func(t *testing.T, id, name string, x float64) {
		t.Helper()
		box, err := spatialmath.NewBox(
			spatialmath.NewPoseFromPoint(r3.Vector{X: x}),
			r3.Vector{X: 100, Y: 100, Z: 100},
			name,
		)
		test.That(t, err, test.ShouldBeNil)
		_, err = DrawGeometry(DrawGeometryOptions{ID: id, Name: name, Geometry: box})
		test.That(t, err, test.ShouldBeNil)
	}

	t.Run("Setup", func(t *testing.T) {
		drawBox(t, keepID, "remove-entity keep", 0)
		drawBox(t, dropID, "remove-entity drop", 300)
	})

	// Removing one entity leaves the rest of the scene alone, which is what lets a redraw diff
	// against the previous batch instead of clearing everything.
	t.Run("RemoveOne", func(t *testing.T) {
		err := RemoveEntity(derivedUUID(dropID))
		test.That(t, err, test.ShouldBeNil)
	})

	t.Run("MissingUUIDIsRejected", func(t *testing.T) {
		test.That(t, RemoveEntity(nil), test.ShouldNotBeNil)
	})
}
