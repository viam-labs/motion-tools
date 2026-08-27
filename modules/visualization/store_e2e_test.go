package main

import (
	"context"
	"os"
	"testing"

	"github.com/golang/geo/r3"
	"github.com/viam-labs/motion-tools/draw"
	drawv1 "github.com/viam-labs/motion-tools/draw/v1"
	"github.com/viam-labs/motion-tools/worldstate"
	commonv1 "go.viam.com/api/common/v1"
	"go.viam.com/rdk/logging"
	robotclient "go.viam.com/rdk/robot/client"
	"go.viam.com/rdk/services/worldstatestore"
	"go.viam.com/rdk/spatialmath"
	"go.viam.com/test"
	"go.viam.com/utils/rpc"
)

// Playwright drives these subtests over a live machine one at a time, screenshotting the
// visualizer between each. They skip unless machine credentials are present.
//
// Entities sit in one row along X, 900mm apart, each shape inside a ±250mm envelope. Nothing
// overlaps, so a change to any one of them is unambiguous in a screenshot.
const (
	slotLine   = -1800.0
	slotPoints = -900.0
	slotArrows = 0.0
	slotNurbs  = 900.0
	slotBox    = 1800.0

	// The chunked cloud gets its own row so filling in never reads as a change to the row above.
	slotCloudY = -1200.0
)

func getWSClient(t *testing.T) worldstatestore.Service {
	t.Helper()

	host := os.Getenv("VIAM_E2E_HOST")
	apiKeyID := os.Getenv("VIAM_E2E_API_KEY_ID")
	apiKey := os.Getenv("VIAM_E2E_API_KEY")

	if host == "" || apiKeyID == "" || apiKey == "" {
		t.Skip("set VIAM_E2E_HOST, VIAM_E2E_API_KEY_ID and VIAM_E2E_API_KEY to run this")
	}

	robot, err := robotclient.New(
		context.Background(),
		host,
		logging.NewDebugLogger("visualization-e2e"),
		robotclient.WithDialOptions(rpc.WithEntityCredentials(
			apiKeyID,
			rpc.Credentials{Type: rpc.CredentialsTypeAPIKey, Payload: apiKey},
		)),
	)
	test.That(t, err, test.ShouldBeNil)
	t.Cleanup(func() { test.That(t, robot.Close(context.Background()), test.ShouldBeNil) })

	store, err := worldstatestore.FromProvider(robot, "world-state-store")
	test.That(t, err, test.ShouldBeNil)

	return store
}

// sender returns a helper that encodes and runs in one step, so a command builder's two return
// values pass straight through: send(worldstate.AddDrawingCommand(...)).
func sender(t *testing.T, store worldstatestore.Service) func(map[string]any, error) {
	return func(cmd map[string]any, err error) {
		t.Helper()

		test.That(t, err, test.ShouldBeNil)

		_, err = store.DoCommand(context.Background(), cmd)
		test.That(t, err, test.ShouldBeNil)
	}
}

// at places an entity in the world frame. WithID derives the UUID from the name, so a later
// subtest can address it without threading a UUID between separate `go test -run` invocations.
func at(name string, x, y, z float64) []draw.DrawableOption {
	return []draw.DrawableOption{
		draw.WithID(name),
		draw.WithPose(spatialmath.NewPoseFromPoint(r3.Vector{X: x, Y: y, Z: z})),
	}
}

func namedUUID(name string) []byte {
	return draw.NewDrawConfig(name, draw.WithID(name)).UUID
}

func TestVisualizationLayout(t *testing.T) {
	store := getWSClient(t)

	// A shallow V, so a later reshape into a tall spike is obvious at a glance.
	t.Run("Line", func(t *testing.T) {
		send := sender(t, store)

		line, err := draw.NewLine(
			[]r3.Vector{{X: -250}, {Z: 200}, {X: 250}},
			draw.WithLineWidth(12),
			draw.WithSingleLineColor(draw.NewColor(draw.WithRGB(0, 120, 255))),
		)
		test.That(t, err, test.ShouldBeNil)

		send(worldstate.AddDrawingCommand(line.Draw("viz-line", at("viz-line", slotLine, 0, 0)...).ToProto()))
	})

	// A 4x4 grid at 150mm spacing: 450mm square, well inside its slot.
	t.Run("Points", func(t *testing.T) {
		send := sender(t, store)

		positions := make([]r3.Vector, 0, 16)
		for row := range 4 {
			for col := range 4 {
				positions = append(positions, r3.Vector{X: float64(col*150 - 225), Y: float64(row*150 - 225), Z: 150})
			}
		}

		points, err := draw.NewPoints(
			positions,
			draw.WithPointsSize(60),
			draw.WithSinglePointColor(draw.NewColor(draw.WithRGB(0, 220, 160))),
		)
		test.That(t, err, test.ShouldBeNil)

		send(worldstate.AddDrawingCommand(points.Draw("viz-points", at("viz-points", slotPoints, 0, 0)...).ToProto()))
	})

	// Three arrows pointing up Z, so hiding them leaves an obvious hole in the row.
	t.Run("Arrows", func(t *testing.T) {
		send := sender(t, store)

		poses := []spatialmath.Pose{
			spatialmath.NewPoseFromPoint(r3.Vector{X: -200}),
			spatialmath.NewPoseFromPoint(r3.Vector{}),
			spatialmath.NewPoseFromPoint(r3.Vector{X: 200}),
		}

		arrows, err := draw.NewArrows(poses, draw.WithSingleArrowColor(draw.NewColor(draw.WithRGB(255, 180, 0))))
		test.That(t, err, test.ShouldBeNil)

		send(worldstate.AddDrawingCommand(arrows.Draw("viz-arrows", at("viz-arrows", slotArrows, 0, 0)...).ToProto()))
	})

	// A clamped cubic arc: 4 control points needs len(controlPoints)+degree+1 = 8 knots.
	t.Run("Nurbs", func(t *testing.T) {
		send := sender(t, store)

		controlPoints := []spatialmath.Pose{
			spatialmath.NewPoseFromPoint(r3.Vector{X: -250}),
			spatialmath.NewPoseFromPoint(r3.Vector{X: -100, Z: 400}),
			spatialmath.NewPoseFromPoint(r3.Vector{X: 100, Z: 400}),
			spatialmath.NewPoseFromPoint(r3.Vector{X: 250}),
		}

		nurbs, err := draw.NewNurbs(
			controlPoints,
			[]float64{0, 0, 0, 0, 1, 1, 1, 1},
			draw.WithNurbsDegree(3),
			draw.WithNurbsLineWidth(12),
			draw.WithNurbsColors(draw.NewColor(draw.WithRGB(200, 80, 255))),
		)
		test.That(t, err, test.ShouldBeNil)

		send(worldstate.AddDrawingCommand(nurbs.Draw("viz-nurbs", at("viz-nurbs", slotNurbs, 0, 0)...).ToProto()))
	})

	// A native Transform, to prove projected drawings and real geometry share one world.
	t.Run("Box", func(t *testing.T) {
		send := sender(t, store)

		box, err := spatialmath.NewBox(spatialmath.NewZeroPose(), r3.Vector{X: 300, Y: 300, Z: 300}, "viz-box")
		test.That(t, err, test.ShouldBeNil)

		drawn, err := draw.NewDrawnGeometry(box, draw.WithGeometryColor(draw.NewColor(draw.WithRGB(255, 90, 90))))
		test.That(t, err, test.ShouldBeNil)

		transform, err := drawn.Draw("viz-box", at("viz-box", slotBox, 0, 150)...)
		test.That(t, err, test.ShouldBeNil)

		send(worldstate.AddTransformCommand(transform))
	})
}

// Each update changes one entity in one unmistakable way, so a screenshot diff points at exactly
// one thing.
func TestVisualizationUpdate(t *testing.T) {
	store := getWSClient(t)

	// The V becomes a tall spike, well above anything else in the row.
	t.Run("ReshapeLine", func(t *testing.T) {
		send := sender(t, store)

		line, err := draw.NewLine(
			[]r3.Vector{{X: -250}, {Z: 900}, {X: 250}},
			draw.WithLineWidth(12),
			draw.WithSingleLineColor(draw.NewColor(draw.WithRGB(0, 120, 255))),
		)
		test.That(t, err, test.ShouldBeNil)

		drawing := line.Draw("viz-line", at("viz-line", slotLine, 0, 0)...).ToProto()
		send(worldstate.UpdateDrawingCommand(namedUUID("viz-line"), drawing, draw.DrawingPathShape))
	})

	// Green to magenta: a hue jump, not a shade of the same colour.
	t.Run("RecolorPoints", func(t *testing.T) {
		send := sender(t, store)

		recoloured := &drawv1.Drawing{
			ReferenceFrame: "viz-points",
			Metadata:       &drawv1.Metadata{Colors: []byte{255, 0, 200}, ColorFormat: drawv1.ColorFormat_COLOR_FORMAT_RGB},
		}

		send(worldstate.UpdateDrawingCommand(namedUUID("viz-points"), recoloured, draw.DrawingPathMetadataColors))
	})

	// The arrows disappear, leaving a hole in the middle of the row.
	t.Run("HideArrows", func(t *testing.T) {
		send := sender(t, store)

		hidden := &drawv1.Drawing{
			ReferenceFrame: "viz-arrows",
			Metadata:       &drawv1.Metadata{Invisible: ptr(true)},
		}

		send(worldstate.UpdateDrawingCommand(namedUUID("viz-arrows"), hidden, draw.DrawingPathMetadataInvisible))
	})

	t.Run("ShowArrows", func(t *testing.T) {
		send := sender(t, store)

		shown := &drawv1.Drawing{
			ReferenceFrame: "viz-arrows",
			Metadata:       &drawv1.Metadata{Invisible: ptr(false)},
		}

		send(worldstate.UpdateDrawingCommand(namedUUID("viz-arrows"), shown, draw.DrawingPathMetadataInvisible))
	})

	// A pose change on a native Transform: the box lifts a metre clear of the row.
	t.Run("RaiseBox", func(t *testing.T) {
		send := sender(t, store)

		raised := &commonv1.Transform{
			ReferenceFrame: "viz-box",
			PoseInObserverFrame: &commonv1.PoseInFrame{
				ReferenceFrame: "world",
				Pose:           &commonv1.Pose{X: slotBox, Y: 0, Z: 1200, OZ: 1},
			},
		}

		send(worldstate.UpdateTransformCommand(namedUUID("viz-box"), raised, draw.TransformPathPoseValue))
	})
}

// A 2,000-point cloud delivered 200 at a time, so the visualizer has to pull the remainder back
// with get_entity_chunk. It grows visibly along +X as the chunks land.
func TestVisualizationChunkedCloud(t *testing.T) {
	store := getWSClient(t)

	const total, chunkSize = 2000, 200

	positions := make([]r3.Vector, 0, total)
	for i := range total {
		positions = append(positions, r3.Vector{
			X: float64(i)*0.9 - 900,
			Y: slotCloudY,
			Z: float64(200 + 150*((i/50)%3)),
		})
	}

	chunkOf := func(start int) *drawv1.Drawing {
		points, err := draw.NewPoints(
			positions[start:start+chunkSize],
			draw.WithPointsSize(40),
			draw.WithSinglePointColor(draw.NewColor(draw.WithRGB(80, 200, 255))),
		)
		test.That(t, err, test.ShouldBeNil)

		return points.Draw("viz-cloud", at("viz-cloud", 0, 0, 0)...).ToProto()
	}

	t.Run("Seed", func(t *testing.T) {
		send := sender(t, store)

		seed := chunkOf(0)
		seed.Metadata.Chunks = &drawv1.Chunks{ChunkSize: chunkSize, Total: total, Stride: 12}

		send(worldstate.AddDrawingCommand(seed))
	})

	// Unmasked updates are chunk appends rather than field patches, and emit no stream traffic;
	// the visualizer pulls them itself.
	t.Run("Fill", func(t *testing.T) {
		send := sender(t, store)

		for start := chunkSize; start < total; start += chunkSize {
			send(worldstate.UpdateDrawingCommand(namedUUID("viz-cloud"), chunkOf(start)))
		}
	})
}

// TestVisualizationReset clears the scene so a run starts from a known-empty world.
//
// The module holds its entities in process and an unchanged machine config does not restart it,
// so a run that ended before TestVisualizationRemove leaves them for the next one to photograph.
func TestVisualizationReset(t *testing.T) {
	sender(t, getWSClient(t))(worldstate.RemoveAllCommand(), nil)
}

// Removal is one entity at a time so each screenshot shows exactly one thing gone, then a bulk
// clear which the world_state_store API has to fan out into one removal per entity.
func TestVisualizationRemove(t *testing.T) {
	store := getWSClient(t)

	t.Run("RemoveLine", func(t *testing.T) {
		send := sender(t, store)

		send(worldstate.RemoveEntityCommand(namedUUID("viz-line")))
	})

	t.Run("RemoveBox", func(t *testing.T) {
		send := sender(t, store)

		send(worldstate.RemoveEntityCommand(namedUUID("viz-box")))
	})

	t.Run("RemoveAll", func(t *testing.T) {
		send := sender(t, store)

		send(worldstate.RemoveAllCommand(), nil)
	})
}

func ptr[T any](value T) *T {
	return &value
}
