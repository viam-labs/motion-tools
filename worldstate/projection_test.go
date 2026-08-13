package worldstate

import (
	"encoding/base64"
	"testing"

	"github.com/viam-labs/motion-tools/draw"
	drawv1 "github.com/viam-labs/motion-tools/draw/v1"
	commonv1 "go.viam.com/api/common/v1"
	"go.viam.com/test"
	"google.golang.org/protobuf/proto"
)

func lineDrawing() *drawv1.Drawing {
	return &drawv1.Drawing{
		ReferenceFrame: "my-line",
		PoseInObserverFrame: &commonv1.PoseInFrame{
			ReferenceFrame: "world",
			Pose:           &commonv1.Pose{X: 1, Y: 2, Z: 3, OZ: 1},
		},
		Uuid: []byte("0123456789abcdef"),
		PhysicalObject: &drawv1.Shape{
			Label: "a line",
			GeometryType: &drawv1.Shape_Line{
				Line: &drawv1.Line{
					Positions: []byte{1, 2, 3, 4},
					LineWidth: proto.Float32(7),
				},
			},
		},
		Metadata: &drawv1.Metadata{
			Colors:      []byte{10, 20, 30},
			ColorFormat: drawv1.ColorFormat_COLOR_FORMAT_RGB,
			Opacities:   []byte{255},
			Invisible:   proto.Bool(true),
		},
	}
}

func TestProjectDrawingCarriesIdentityNatively(t *testing.T) {
	drawing := lineDrawing()

	transform, err := ProjectDrawing(drawing)
	test.That(t, err, test.ShouldBeNil)

	test.That(t, transform.GetReferenceFrame(), test.ShouldEqual, "my-line")
	test.That(t, transform.GetUuid(), test.ShouldResemble, drawing.GetUuid())
	test.That(t, transform.GetPoseInObserverFrame().GetReferenceFrame(), test.ShouldEqual, "world")
	test.That(t, transform.GetPoseInObserverFrame().GetPose().GetX(), test.ShouldEqual, 1.0)

	// No Drawing shape maps onto a common.v1.Geometry case, so the slot stays empty.
	test.That(t, transform.GetPhysicalObject(), test.ShouldBeNil)
}

// The metadata Struct contract is consumed by the frontend's metadataFromStruct, which reads
// proto field names, base64 bytes and numeric enums. This pins that encoding.
func TestProjectDrawingMetadataMatchesStructContract(t *testing.T) {
	transform, err := ProjectDrawing(lineDrawing())
	test.That(t, err, test.ShouldBeNil)

	fields := transform.GetMetadata().GetFields()

	test.That(t, fields["colors"].GetStringValue(), test.ShouldEqual,
		base64.StdEncoding.EncodeToString([]byte{10, 20, 30}))
	test.That(t, fields["opacities"].GetStringValue(), test.ShouldEqual,
		base64.StdEncoding.EncodeToString([]byte{255}))
	test.That(t, fields["color_format"].GetNumberValue(), test.ShouldEqual,
		float64(drawv1.ColorFormat_COLOR_FORMAT_RGB))
	test.That(t, fields["invisible"].GetBoolValue(), test.ShouldBeTrue)
}

func TestProjectDrawingChunksAndRelationshipsUseProtoNames(t *testing.T) {
	drawing := lineDrawing()
	drawing.Metadata.Chunks = &drawv1.Chunks{ChunkSize: 50, Total: 10_000, Stride: 12}
	drawing.Metadata.Relationships = []*drawv1.Relationship{{
		TargetUuid:   []byte("fedcba9876543210"),
		Type:         "HoverLink",
		IndexMapping: proto.String("index"),
	}}

	transform, err := ProjectDrawing(drawing)
	test.That(t, err, test.ShouldBeNil)

	chunks := transform.GetMetadata().GetFields()["chunks"].GetStructValue().GetFields()
	test.That(t, chunks["chunk_size"].GetNumberValue(), test.ShouldEqual, 50.0)
	test.That(t, chunks["total"].GetNumberValue(), test.ShouldEqual, 10_000.0)
	test.That(t, chunks["stride"].GetNumberValue(), test.ShouldEqual, 12.0)

	relationships := transform.GetMetadata().GetFields()["relationships"].GetListValue().GetValues()
	test.That(t, relationships, test.ShouldHaveLength, 1)

	relationship := relationships[0].GetStructValue().GetFields()
	test.That(t, relationship["target_uuid"].GetStringValue(), test.ShouldEqual,
		base64.StdEncoding.EncodeToString([]byte("fedcba9876543210")))
	test.That(t, relationship["type"].GetStringValue(), test.ShouldEqual, "HoverLink")
	test.That(t, relationship["index_mapping"].GetStringValue(), test.ShouldEqual, "index")
}

func TestProjectedShapeRoundTripsEveryCase(t *testing.T) {
	shapes := map[string]*drawv1.Shape{
		"arrows": {GeometryType: &drawv1.Shape_Arrows{
			Arrows: &drawv1.Arrows{Poses: []byte{9, 8, 7}},
		}},
		"line": {GeometryType: &drawv1.Shape_Line{
			Line: &drawv1.Line{Positions: []byte{1, 2}, LineWidth: proto.Float32(3), DotColors: []byte{4}},
		}},
		"points": {GeometryType: &drawv1.Shape_Points{
			Points: &drawv1.Points{Positions: []byte{5, 6}, PointSize: proto.Float32(11)},
		}},
		"nurbs": {GeometryType: &drawv1.Shape_Nurbs{
			Nurbs: &drawv1.Nurbs{ControlPoints: []byte{1}, Knots: []byte{2}, Degree: proto.Int32(3)},
		}},
		"model": {GeometryType: &drawv1.Shape_Model{
			Model: &drawv1.Model{
				Assets: []*drawv1.ModelAsset{{
					MimeType:  "model/gltf-binary",
					SizeBytes: proto.Uint64(1234),
					Content:   &drawv1.ModelAsset_Url{Url: "https://example.com/a.glb"},
				}},
				Scale: &commonv1.Vector3{X: 1, Y: 2, Z: 3},
			},
		}},
	}

	for name, shape := range shapes {
		t.Run(name, func(t *testing.T) {
			shape.Center = &commonv1.Pose{X: 5, OZ: 1}
			shape.Label = name

			transform, err := ProjectDrawing(&drawv1.Drawing{PhysicalObject: shape})
			test.That(t, err, test.ShouldBeNil)

			decoded, err := ProjectedShape(transform.GetMetadata())
			test.That(t, err, test.ShouldBeNil)
			test.That(t, proto.Equal(decoded, shape), test.ShouldBeTrue)
		})
	}
}

func TestProjectedShapeIgnoresTrueTransforms(t *testing.T) {
	transform, err := ProjectDrawing(&drawv1.Drawing{
		Metadata: &drawv1.Metadata{Colors: []byte{1, 2, 3}},
	})
	test.That(t, err, test.ShouldBeNil)

	shape, err := ProjectedShape(transform.GetMetadata())
	test.That(t, err, test.ShouldBeNil)
	test.That(t, shape, test.ShouldBeNil)

	shape, err = ProjectedShape(nil)
	test.That(t, err, test.ShouldBeNil)
	test.That(t, shape, test.ShouldBeNil)
}

func TestProjectDrawingRejectsNil(t *testing.T) {
	_, err := ProjectDrawing(nil)
	test.That(t, err, test.ShouldBeError, ErrNilDrawing)
}

func TestProjectFieldMask(t *testing.T) {
	tests := []struct {
		name     string
		paths    []string
		expected []string
	}{
		{"pose passes through", []string{draw.DrawingPathPoseValue}, []string{draw.DrawingPathPoseValue}},
		{"parent passes through", []string{draw.DrawingPathPoseParent}, []string{draw.DrawingPathPoseParent}},
		{"shape becomes metadata", []string{draw.DrawingPathShape}, []string{draw.TransformPathMetadata}},
		{"metadata field collapses", []string{draw.DrawingPathMetadataColors}, []string{draw.TransformPathMetadata}},
		{
			"shape and metadata dedupe",
			[]string{draw.DrawingPathShape, draw.DrawingPathMetadataColors, draw.DrawingPathMetadataInvisible},
			[]string{draw.TransformPathMetadata},
		},
		{
			"order is preserved",
			[]string{draw.DrawingPathMetadataColors, draw.DrawingPathPoseValue},
			[]string{draw.TransformPathMetadata, draw.DrawingPathPoseValue},
		},
		{"immutable paths drop", []string{draw.DrawingPathReferenceFrame, draw.DrawingPathUUID}, []string{}},
		{
			"an empty mask means everything",
			nil,
			[]string{draw.TransformPathPose, draw.TransformPathMetadata},
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			test.That(t, ProjectFieldMask(tc.paths), test.ShouldResemble, tc.expected)
		})
	}
}
