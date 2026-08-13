package worldstate

import (
	"encoding/json"
	"errors"
	"fmt"
	"maps"
	"strings"

	"github.com/viam-labs/motion-tools/draw"
	drawv1 "github.com/viam-labs/motion-tools/draw/v1"
	commonv1 "go.viam.com/api/common/v1"
	"google.golang.org/protobuf/encoding/protojson"
	"google.golang.org/protobuf/proto"
	"google.golang.org/protobuf/types/known/structpb"
)

// ErrNilDrawing is returned when a nil Drawing is projected onto a Transform.
var ErrNilDrawing = errors.New("cannot project a nil drawing")

// projectionShapeKey is the metadata Struct key that carries a projected Shape. It is the JSON
// name of draw.v1.DrawingProjection's only field.
const projectionShapeKey = "shape"

// The metadata Struct contract predates protojson on this path: proto field names, numeric
// enums. These options reproduce it, so neither side needs a hand-written encoder.
var (
	projectionMarshal   = protojson.MarshalOptions{UseProtoNames: true, UseEnumNumbers: true}
	projectionUnmarshal = protojson.UnmarshalOptions{DiscardUnknown: true}
)

// ProjectDrawing renders a Drawing as a viam.common.v1.Transform so it can travel over the
// world_state_store API.
//
// Frame, pose and UUID ride natively, keeping field-mask deltas and the frame system working;
// the Shape and Metadata share the metadata Struct.
func ProjectDrawing(drawing *drawv1.Drawing) (*commonv1.Transform, error) {
	if drawing == nil {
		return nil, ErrNilDrawing
	}

	fields := map[string]any{}

	if metadata := drawing.GetMetadata(); metadata != nil {
		if err := mergeProtoJSON(fields, metadata); err != nil {
			return nil, fmt.Errorf("encoding drawing metadata: %w", err)
		}
	}

	if shape := drawing.GetPhysicalObject(); shape != nil {
		if err := mergeProtoJSON(fields, &drawv1.DrawingProjection{Shape: shape}); err != nil {
			return nil, fmt.Errorf("encoding drawing shape: %w", err)
		}
	}

	metadata, err := structpb.NewStruct(fields)
	if err != nil {
		return nil, fmt.Errorf("building transform metadata: %w", err)
	}

	// physical_object stays empty: no Drawing shape maps onto a common.v1.Geometry case.
	return &commonv1.Transform{
		ReferenceFrame:      drawing.GetReferenceFrame(),
		PoseInObserverFrame: drawing.GetPoseInObserverFrame(),
		Uuid:                drawing.GetUuid(),
		Metadata:            metadata,
	}, nil
}

// ProjectedShape returns the Shape carried in a projected Transform's metadata, or nil when the
// Transform is not a projected Drawing.
func ProjectedShape(metadata *structpb.Struct) (*drawv1.Shape, error) {
	value := metadata.GetFields()[projectionShapeKey]
	if value == nil {
		return nil, nil
	}

	encoded, err := projectionMarshal.Marshal(value)
	if err != nil {
		return nil, fmt.Errorf("re-encoding projected shape: %w", err)
	}

	shape := &drawv1.Shape{}
	if err := projectionUnmarshal.Unmarshal(encoded, shape); err != nil {
		return nil, fmt.Errorf("decoding projected shape: %w", err)
	}

	return shape, nil
}

// ProjectFieldMask rewrites a Drawing's updated-field paths for its projected Transform,
// preserving order and dropping duplicates. Transform events must not be run through this.
func ProjectFieldMask(paths []string) []string {
	// An empty mask means every field changed, which is what re-adding an existing UUID
	// reports. A consumer acting path by path would otherwise treat it as a no-op.
	if len(paths) == 0 {
		return []string{draw.TransformPathPose, draw.TransformPathMetadata}
	}

	projected := make([]string, 0, len(paths))
	seen := make(map[string]struct{}, len(paths))

	for _, path := range paths {
		var mapped string

		switch {
		case matchesPath(path, draw.DrawingPathPose):
			mapped = path
		// Shape and metadata share one Struct, so everything but the pose collapses into it.
		case matchesPath(path, draw.DrawingPathShape), matchesPath(path, draw.DrawingPathMetadata):
			mapped = draw.TransformPathMetadata
		default:
			continue
		}

		if _, ok := seen[mapped]; ok {
			continue
		}
		seen[mapped] = struct{}{}
		projected = append(projected, mapped)
	}

	return projected
}

// matchesPath reports whether path is root or a field nested under it.
func matchesPath(path, root string) bool {
	return path == root || strings.HasPrefix(path, root+".")
}

// mergeProtoJSON encodes msg with the projection options and copies its top-level JSON fields
// into dst, so several messages can share one metadata Struct.
func mergeProtoJSON(dst map[string]any, msg proto.Message) error {
	encoded, err := projectionMarshal.Marshal(msg)
	if err != nil {
		return err
	}

	decoded := map[string]any{}
	if err := json.Unmarshal(encoded, &decoded); err != nil {
		return err
	}

	maps.Copy(dst, decoded)

	return nil
}
