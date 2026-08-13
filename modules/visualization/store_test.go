package main

import (
	"context"
	"encoding/base64"
	"encoding/binary"
	"errors"
	"io"
	"math"
	"testing"
	"time"

	"github.com/golang/geo/r3"
	"github.com/viam-labs/motion-tools/draw"
	"github.com/viam-labs/motion-tools/worldstate"
	pb "go.viam.com/api/service/worldstatestore/v1"
	"go.viam.com/rdk/logging"
	"go.viam.com/rdk/resource"
	"go.viam.com/rdk/services/worldstatestore"
	"go.viam.com/rdk/spatialmath"
	"go.viam.com/test"
	"google.golang.org/protobuf/proto"
)

func newTestStore(t *testing.T) *Store {
	t.Helper()

	conf := resource.Config{
		Name:                "world-state-store",
		API:                 worldstatestore.API,
		Model:               Model,
		ConvertedAttributes: &Config{TempDir: t.TempDir()},
	}

	svc, err := newStore(context.Background(), nil, conf, logging.NewTestLogger(t))
	test.That(t, err, test.ShouldBeNil)
	t.Cleanup(func() { test.That(t, svc.Close(context.Background()), test.ShouldBeNil) })

	store, ok := svc.(*Store)
	test.That(t, ok, test.ShouldBeTrue)

	return store
}

// float32sToBytes packs floats the way every draw shape buffer is encoded: little-endian
// float32, three per position.
func float32sToBytes(values []float32) []byte {
	raw := make([]byte, len(values)*4)
	for i, v := range values {
		binary.LittleEndian.PutUint32(raw[i*4:], math.Float32bits(v))
	}

	return raw
}

// encodeFloat32s packs floats and base64s them, which is how a bytes field travels in
// protojson.
func encodeFloat32s(values []float32) string {
	return base64.StdEncoding.EncodeToString(float32sToBytes(values))
}

// waitFor polls until condition holds, so tests never race the follower goroutine.
func waitFor(t *testing.T, condition func() bool) {
	t.Helper()

	deadline := time.After(5 * time.Second)
	for {
		if condition() {
			return
		}
		select {
		case <-deadline:
			t.Fatal("condition not met within timeout")
		case <-time.After(5 * time.Millisecond):
		}
	}
}

func addLine(t *testing.T, store *Store, name string, positions []byte) []byte {
	t.Helper()

	response, err := store.DoCommand(context.Background(), map[string]any{
		"command": "AddEntity",
		"request": map[string]any{
			"drawing": map[string]any{
				"reference_frame": name,
				"pose_in_observer_frame": map[string]any{
					"reference_frame": "world",
					"pose":            map[string]any{"x": 1.0, "oz": 1.0},
				},
				"physical_object": map[string]any{
					"line": map[string]any{
						"positions":  base64.StdEncoding.EncodeToString(positions),
						"line_width": 7.0,
					},
				},
				"metadata": map[string]any{
					"colors": base64.StdEncoding.EncodeToString([]byte{1, 2, 3}),
				},
			},
		},
	})
	test.That(t, err, test.ShouldBeNil)

	encoded, ok := response["uuid"].(string)
	test.That(t, ok, test.ShouldBeTrue)

	raw, err := base64.StdEncoding.DecodeString(encoded)
	test.That(t, err, test.ShouldBeNil)

	return raw
}

func TestDoCommandTunnelsADrawingAndProjectsIt(t *testing.T) {
	store := newTestStore(t)
	ctx := context.Background()

	positions := []byte{0, 0, 128, 63}
	raw := addLine(t, store, "my-line", positions)

	waitFor(t, func() bool {
		uuids, err := store.ListUUIDs(ctx, nil)
		return err == nil && len(uuids) == 1
	})

	transform, err := store.GetTransform(ctx, raw, nil)
	test.That(t, err, test.ShouldBeNil)
	test.That(t, transform.GetReferenceFrame(), test.ShouldEqual, "my-line")
	test.That(t, transform.GetPoseInObserverFrame().GetReferenceFrame(), test.ShouldEqual, "world")

	// A Line has no common.v1.Geometry equivalent, so it travels in the metadata Struct.
	test.That(t, transform.GetPhysicalObject(), test.ShouldBeNil)

	shape, err := worldstate.ProjectedShape(transform.GetMetadata())
	test.That(t, err, test.ShouldBeNil)
	test.That(t, shape.GetLine().GetLineWidth(), test.ShouldEqual, float32(7))
	test.That(t, shape.GetLine().GetPositions(), test.ShouldResemble, positions)
}

// The path a user of this module actually takes: build with draw's shape builders, encode with
// worldstate.Command, send through DoCommand. Nobody should be hand-writing protojson.
func TestBuiltDrawingsSurviveTheCommandPath(t *testing.T) {
	store := newTestStore(t)
	ctx := context.Background()

	line, err := draw.NewLine(
		[]r3.Vector{{X: -250}, {Z: 200}, {X: 250}},
		draw.WithLineWidth(12),
		draw.WithSingleLineColor(draw.NewColor(draw.WithRGB(0, 120, 255))),
	)
	test.That(t, err, test.ShouldBeNil)

	built := line.Draw("built-line",
		draw.WithID("built-line"),
		draw.WithPose(spatialmath.NewPoseFromPoint(r3.Vector{X: 1000, Z: 250})),
	).ToProto()

	cmd, err := worldstate.AddDrawingCommand(built)
	test.That(t, err, test.ShouldBeNil)

	_, err = store.DoCommand(ctx, cmd)
	test.That(t, err, test.ShouldBeNil)

	waitFor(t, func() bool {
		uuids, listErr := store.ListUUIDs(ctx, nil)
		return listErr == nil && len(uuids) == 1
	})

	transform, err := store.GetTransform(ctx, built.GetUuid(), nil)
	test.That(t, err, test.ShouldBeNil)
	test.That(t, transform.GetReferenceFrame(), test.ShouldEqual, "built-line")
	test.That(t, transform.GetPoseInObserverFrame().GetPose().GetX(), test.ShouldEqual, 1000.0)

	// The shape the builder produced has to come back byte-identical on the far side.
	shape, err := worldstate.ProjectedShape(transform.GetMetadata())
	test.That(t, err, test.ShouldBeNil)
	test.That(t, proto.Equal(shape, built.GetPhysicalObject()), test.ShouldBeTrue)

	// And a builder-made update lands on the same entity, addressed by its derived UUID.
	raised, err := draw.NewLine([]r3.Vector{{X: -250}, {Z: 900}, {X: 250}}, draw.WithLineWidth(12))
	test.That(t, err, test.ShouldBeNil)

	update := raised.Draw("built-line", draw.WithID("built-line")).ToProto()
	cmd, err = worldstate.UpdateDrawingCommand(built.GetUuid(), update, draw.DrawingPathShape)
	test.That(t, err, test.ShouldBeNil)

	_, err = store.DoCommand(ctx, cmd)
	test.That(t, err, test.ShouldBeNil)

	waitFor(t, func() bool {
		current, getErr := store.GetTransform(ctx, built.GetUuid(), nil)
		if getErr != nil {
			return false
		}
		updated, shapeErr := worldstate.ProjectedShape(current.GetMetadata())
		return shapeErr == nil && proto.Equal(updated, update.GetPhysicalObject())
	})
}

func TestTransformsPassThroughWithoutAShape(t *testing.T) {
	store := newTestStore(t)
	ctx := context.Background()

	_, err := store.DoCommand(ctx, map[string]any{
		"command": "AddEntity",
		"request": map[string]any{
			"transform": map[string]any{
				"reference_frame":        "my-box",
				"pose_in_observer_frame": map[string]any{"reference_frame": "world"},
				"physical_object": map[string]any{
					"box": map[string]any{"dims_mm": map[string]any{"x": 100.0, "y": 100.0, "z": 100.0}},
				},
			},
		},
	})
	test.That(t, err, test.ShouldBeNil)

	var uuids [][]byte
	waitFor(t, func() bool {
		listed, listErr := store.ListUUIDs(ctx, nil)
		uuids = listed
		return listErr == nil && len(listed) == 1
	})

	transform, err := store.GetTransform(ctx, uuids[0], nil)
	test.That(t, err, test.ShouldBeNil)
	test.That(t, transform.GetPhysicalObject().GetBox().GetDimsMm().GetX(), test.ShouldEqual, 100.0)

	shape, err := worldstate.ProjectedShape(transform.GetMetadata())
	test.That(t, err, test.ShouldBeNil)
	test.That(t, shape, test.ShouldBeNil)
}

func TestStreamDeliversProjectedChanges(t *testing.T) {
	store := newTestStore(t)
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	stream, err := store.StreamTransformChanges(ctx, nil)
	test.That(t, err, test.ShouldBeNil)

	addLine(t, store, "streamed-line", []byte{0, 0, 128, 63})

	change, err := stream.Next()
	test.That(t, err, test.ShouldBeNil)
	test.That(t, change.ChangeType, test.ShouldEqual, pb.TransformChangeType_TRANSFORM_CHANGE_TYPE_ADDED)
	test.That(t, change.Transform.GetReferenceFrame(), test.ShouldEqual, "streamed-line")

	shape, err := worldstate.ProjectedShape(change.Transform.GetMetadata())
	test.That(t, err, test.ShouldBeNil)
	test.That(t, shape.GetLine(), test.ShouldNotBeNil)
}

func TestRemoveAllFansOutOneRemovedPerEntity(t *testing.T) {
	store := newTestStore(t)
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	addLine(t, store, "first", []byte{0, 0, 128, 63})
	addLine(t, store, "second", []byte{0, 0, 0, 64})

	waitFor(t, func() bool {
		uuids, err := store.ListUUIDs(ctx, nil)
		return err == nil && len(uuids) == 2
	})

	stream, err := store.StreamTransformChanges(ctx, nil)
	test.That(t, err, test.ShouldBeNil)

	_, err = store.DoCommand(ctx, map[string]any{"command": "RemoveAll"})
	test.That(t, err, test.ShouldBeNil)

	// The world_state_store API has no bulk-removal signal, so the scope becomes one event each.
	for range 2 {
		change, nextErr := stream.Next()
		test.That(t, nextErr, test.ShouldBeNil)
		test.That(t, change.ChangeType, test.ShouldEqual, pb.TransformChangeType_TRANSFORM_CHANGE_TYPE_REMOVED)
	}

	waitFor(t, func() bool {
		uuids, listErr := store.ListUUIDs(ctx, nil)
		return listErr == nil && len(uuids) == 0
	})
}

// A chunked drawing arrives as an AddEntity declaring the total, then one unmasked UpdateEntity
// per remaining chunk. This walks that loop and pulls it back with get_entity_chunk.
func TestChunkedPointCloudRoundTrip(t *testing.T) {
	store := newTestStore(t)
	ctx := context.Background()

	const total, chunkSize, stride = 40, 10, 12

	positions := make([]float32, total*3)
	for i := range total {
		positions[i*3] = float32(i * 10)
		positions[i*3+1] = float32(i * 5)
		positions[i*3+2] = 100
	}

	response, err := store.DoCommand(ctx, map[string]any{
		"command": "AddEntity",
		"request": map[string]any{
			"drawing": map[string]any{
				"reference_frame":        "cloud",
				"pose_in_observer_frame": map[string]any{"reference_frame": "world"},
				"physical_object": map[string]any{
					"points": map[string]any{"positions": encodeFloat32s(positions[:chunkSize*3])},
				},
				"metadata": map[string]any{
					"chunks": map[string]any{"chunk_size": chunkSize, "total": total, "stride": stride},
				},
			},
		},
	})
	test.That(t, err, test.ShouldBeNil)

	encoded, ok := response["uuid"].(string)
	test.That(t, ok, test.ShouldBeTrue)
	raw, err := base64.StdEncoding.DecodeString(encoded)
	test.That(t, err, test.ShouldBeNil)

	for start := chunkSize; start < total; start += chunkSize {
		_, err = store.DoCommand(ctx, map[string]any{
			"command": "UpdateEntity",
			"request": map[string]any{
				"uuid": encoded,
				"drawing": map[string]any{
					// An append is still validated as an update, so it has to name the same frame.
					"reference_frame": "cloud",
					"physical_object": map[string]any{
						"points": map[string]any{
							"positions": encodeFloat32s(positions[start*3 : (start+chunkSize)*3]),
						},
					},
				},
			},
		})
		test.That(t, err, test.ShouldBeNil)
	}

	// The projected transform advertises the chunking so the visualizer knows to pull.
	waitFor(t, func() bool {
		uuids, listErr := store.ListUUIDs(ctx, nil)
		return listErr == nil && len(uuids) == 1
	})

	transform, err := store.GetTransform(ctx, raw, nil)
	test.That(t, err, test.ShouldBeNil)

	chunks := transform.GetMetadata().GetFields()["chunks"].GetStructValue().GetFields()
	test.That(t, chunks["total"].GetNumberValue(), test.ShouldEqual, float64(total))
	test.That(t, chunks["chunk_size"].GetNumberValue(), test.ShouldEqual, float64(chunkSize))

	uuidString, err := uuidKey(raw)
	test.That(t, err, test.ShouldBeNil)

	// The chunk reply keeps the shape the visualizer's decoder already reads.
	chunk, err := store.DoCommand(ctx, map[string]any{
		"command": "get_entity_chunk",
		"uuid":    uuidString,
		"start":   float64(chunkSize),
	})
	test.That(t, err, test.ShouldBeNil)
	test.That(t, chunk["start"], test.ShouldEqual, float64(chunkSize))

	entity, ok := chunk["entity"].(map[string]any)
	test.That(t, ok, test.ShouldBeTrue)

	physical, ok := entity["physical_object"].(map[string]any)
	test.That(t, ok, test.ShouldBeTrue)
	points, ok := physical["points"].(map[string]any)
	test.That(t, ok, test.ShouldBeTrue)

	got, err := base64.StdEncoding.DecodeString(points["positions"].(string))
	test.That(t, err, test.ShouldBeNil)
	test.That(t, got, test.ShouldResemble, float32sToBytes(positions[chunkSize*3:(chunkSize*2)*3]))
}

func TestDoCommandRejectsUnusableCommands(t *testing.T) {
	store := newTestStore(t)
	ctx := context.Background()

	_, err := store.DoCommand(ctx, map[string]any{})
	test.That(t, err, test.ShouldBeError, ErrMissingCommand)

	_, err = store.DoCommand(ctx, map[string]any{"command": "Nonexistent"})
	test.That(t, err, test.ShouldNotBeNil)
	test.That(t, err.Error(), test.ShouldContainSubstring, "unknown command")

	_, err = store.DoCommand(ctx, map[string]any{"command": "AddEntity", "request": "not-an-object"})
	test.That(t, err, test.ShouldNotBeNil)
}

func TestGetTransformReportsMissingEntities(t *testing.T) {
	store := newTestStore(t)

	_, err := store.GetTransform(context.Background(), make([]byte, 16), nil)
	test.That(t, errors.Is(err, ErrTransformNotFound), test.ShouldBeTrue)
}

func TestClosedStreamEnds(t *testing.T) {
	store := newTestStore(t)
	ctx, cancel := context.WithCancel(context.Background())

	stream, err := store.StreamTransformChanges(ctx, nil)
	test.That(t, err, test.ShouldBeNil)

	cancel()

	_, err = stream.Next()
	test.That(t, err, test.ShouldNotBeNil)
	test.That(t, errors.Is(err, context.Canceled) || errors.Is(err, io.EOF), test.ShouldBeTrue)
}
