package worldstate

import (
	"encoding/json"
	"testing"

	"github.com/golang/geo/r3"
	"github.com/viam-labs/motion-tools/draw"
	drawv1 "github.com/viam-labs/motion-tools/draw/v1"
	commonv1 "go.viam.com/api/common/v1"
	"go.viam.com/rdk/spatialmath"
	"go.viam.com/test"
	"google.golang.org/protobuf/encoding/protojson"
	"google.golang.org/protobuf/proto"
)

// decodeRequest reverses what a module does with a command payload, so these tests assert the
// round trip a caller actually depends on rather than the JSON's exact shape.
func decodeRequest(t *testing.T, cmd map[string]any, into proto.Message) {
	t.Helper()

	request, ok := cmd[RequestKey].(map[string]any)
	test.That(t, ok, test.ShouldBeTrue)

	encoded, err := json.Marshal(request)
	test.That(t, err, test.ShouldBeNil)

	test.That(t, protojson.Unmarshal(encoded, into), test.ShouldBeNil)
}

func TestAddDrawingCommandRoundTripsABuiltLine(t *testing.T) {
	line, err := draw.NewLine(
		[]r3.Vector{{X: -250}, {Z: 200}, {X: 250}},
		draw.WithLineWidth(12),
		draw.WithSingleLineColor(draw.NewColor(draw.WithRGB(0, 120, 255))),
	)
	test.That(t, err, test.ShouldBeNil)

	built := line.Draw("my-line", draw.WithID("my-line")).ToProto()

	cmd, err := AddDrawingCommand(built)
	test.That(t, err, test.ShouldBeNil)
	test.That(t, cmd[CommandKey], test.ShouldEqual, CommandAddEntity)

	decoded := &drawv1.AddEntityRequest{}
	decodeRequest(t, cmd, decoded)

	test.That(t, proto.Equal(decoded.GetDrawing(), built), test.ShouldBeTrue)
	test.That(t, decoded.GetDrawing().GetPhysicalObject().GetLine().GetLineWidth(), test.ShouldEqual, float32(12))
}

func TestAddTransformCommandRoundTripsABuiltGeometry(t *testing.T) {
	box, err := spatialmath.NewBox(spatialmath.NewZeroPose(), r3.Vector{X: 300, Y: 300, Z: 300}, "my-box")
	test.That(t, err, test.ShouldBeNil)

	drawn, err := draw.NewDrawnGeometry(box, draw.WithGeometryColor(draw.NewColor(draw.WithRGB(255, 90, 90))))
	test.That(t, err, test.ShouldBeNil)

	built, err := drawn.Draw("my-box", draw.WithID("my-box"))
	test.That(t, err, test.ShouldBeNil)

	cmd, err := AddTransformCommand(built)
	test.That(t, err, test.ShouldBeNil)

	decoded := &drawv1.AddEntityRequest{}
	decodeRequest(t, cmd, decoded)

	test.That(t, proto.Equal(decoded.GetTransform(), built), test.ShouldBeTrue)
}

func TestUpdateCommandsCarryTheirMask(t *testing.T) {
	uuid := draw.NewDrawConfig("my-line", draw.WithID("my-line")).UUID

	cmd, err := UpdateDrawingCommand(uuid, &drawv1.Drawing{ReferenceFrame: "my-line"}, draw.DrawingPathMetadataColors)
	test.That(t, err, test.ShouldBeNil)

	decoded := &drawv1.UpdateEntityRequest{}
	decodeRequest(t, cmd, decoded)

	test.That(t, decoded.GetUuid(), test.ShouldResemble, uuid)
	test.That(t, decoded.GetUpdatedFields().GetPaths(), test.ShouldResemble, []string{draw.DrawingPathMetadataColors})

	transformCmd, err := UpdateTransformCommand(uuid, &commonv1.Transform{ReferenceFrame: "my-box"}, draw.TransformPathPoseValue)
	test.That(t, err, test.ShouldBeNil)

	decodedTransform := &drawv1.UpdateEntityRequest{}
	decodeRequest(t, transformCmd, decodedTransform)

	test.That(t, decodedTransform.GetUpdatedFields().GetPaths(), test.ShouldResemble, []string{draw.TransformPathPoseValue})
}

// An empty mask is a wholesale replace, and on a chunked entity it is a chunk append. Either
// way the field must be absent rather than an empty list.
func TestUpdateCommandOmitsAnEmptyMask(t *testing.T) {
	cmd, err := UpdateDrawingCommand(nil, &drawv1.Drawing{ReferenceFrame: "cloud"})
	test.That(t, err, test.ShouldBeNil)

	request, ok := cmd[RequestKey].(map[string]any)
	test.That(t, ok, test.ShouldBeTrue)

	_, present := request["updated_fields"]
	test.That(t, present, test.ShouldBeFalse)
}

func TestCommandsWithoutARequest(t *testing.T) {
	test.That(t, RemoveAllCommand(), test.ShouldResemble, map[string]any{CommandKey: CommandRemoveAll})

	// The flat form, not the tunnelled CommandGetEntityChunk: uuid stays a plain string.
	chunk := GetEntityChunkCommand("a2e1a1e6-0000-4000-8000-000000000000", 200)
	test.That(t, chunk[CommandKey], test.ShouldEqual, CommandGetEntityChunkFlat)
	test.That(t, chunk["uuid"], test.ShouldEqual, "a2e1a1e6-0000-4000-8000-000000000000")
	test.That(t, chunk["start"], test.ShouldEqual, float64(200))
}

func TestCommandsRejectNilEntities(t *testing.T) {
	_, err := AddDrawingCommand(nil)
	test.That(t, err, test.ShouldBeError, ErrNilEntity)

	_, err = AddTransformCommand(nil)
	test.That(t, err, test.ShouldBeError, ErrNilEntity)

	_, err = UpdateDrawingCommand(nil, nil)
	test.That(t, err, test.ShouldBeError, ErrNilEntity)
}
