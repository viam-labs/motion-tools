// Package worldstate carries the draw API over Viam's world_state_store service.
//
// It holds the two halves of that transport: the DoCommand payloads a writer sends, and the
// projection of a draw.v1.Drawing onto the viam.common.v1.Transform the API speaks.
package worldstate

import (
	"encoding/json"
	"errors"
	"fmt"

	drawv1 "github.com/viam-labs/motion-tools/draw/v1"
	commonv1 "go.viam.com/api/common/v1"
	"google.golang.org/protobuf/encoding/protojson"
	"google.golang.org/protobuf/proto"
	"google.golang.org/protobuf/types/known/fieldmaskpb"
)

// ErrNilEntity is returned when a command is built from a nil drawing or transform.
var ErrNilEntity = errors.New("cannot build a command from a nil entity")

// Keys of a DoCommand payload: the method name and its protojson request.
const (
	CommandKey = "command"
	RequestKey = "request"
)

// Every command names a draw.v1.DrawService method, and its request travels as protojson of
// that method's request message.
const (
	CommandAddEntity           = "AddEntity"
	CommandAddEntities         = "AddEntities"
	CommandUpdateEntity        = "UpdateEntity"
	CommandRemoveEntity        = "RemoveEntity"
	CommandRemoveAll           = "RemoveAll"
	CommandRemoveAllDrawings   = "RemoveAllDrawings"
	CommandRemoveAllTransforms = "RemoveAllTransforms"
	CommandCreateRelationship  = "CreateRelationship"
	CommandDeleteRelationship  = "DeleteRelationship"
	CommandSetScene            = "SetScene"
	CommandGetEntityChunk      = "GetEntityChunk"
)

// CommandGetEntityChunkFlat is the one request that is not tunnelled. The visualizer already
// sends chunked reads in this flat shape, so a store accepts it verbatim.
const CommandGetEntityChunkFlat = "get_entity_chunk"

// Proto field names make a logged command read like the .proto file, and numeric enums keep the
// metadata Struct contract identical on both halves of the wire.
var commandMarshal = protojson.MarshalOptions{UseProtoNames: true, UseEnumNumbers: true}

// Command builds the DoCommand payload for a draw.v1.DrawService method. The request travels as
// protojson, so draw.v1 stays the only definition of the vocabulary.
//
//	drawing := line.Draw("my-line", draw.WithID("my-line"))
//	cmd, err := worldstate.AddDrawingCommand(drawing.ToProto())
//	_, err = store.DoCommand(ctx, cmd)
func Command(method string, request proto.Message) (map[string]any, error) {
	command := map[string]any{CommandKey: method}

	if request == nil {
		return command, nil
	}

	encoded, err := commandMarshal.Marshal(request)
	if err != nil {
		return nil, fmt.Errorf("encoding %s request: %w", method, err)
	}

	fields := map[string]any{}
	if err := json.Unmarshal(encoded, &fields); err != nil {
		return nil, fmt.Errorf("re-encoding %s request: %w", method, err)
	}

	command[RequestKey] = fields

	return command, nil
}

// AddDrawingCommand adds a Drawing built by the draw package's shape builders.
func AddDrawingCommand(drawing *drawv1.Drawing) (map[string]any, error) {
	if drawing == nil {
		return nil, ErrNilEntity
	}

	return Command(CommandAddEntity, &drawv1.AddEntityRequest{
		Entity: &drawv1.AddEntityRequest_Drawing{Drawing: drawing},
	})
}

// AddTransformCommand adds a Transform, such as one from NewTransform or DrawnGeometry.Draw.
func AddTransformCommand(transform *commonv1.Transform) (map[string]any, error) {
	if transform == nil {
		return nil, ErrNilEntity
	}

	return Command(CommandAddEntity, &drawv1.AddEntityRequest{
		Entity: &drawv1.AddEntityRequest_Transform{Transform: transform},
	})
}

// UpdateDrawingCommand patches the listed draw.DrawingPath* paths on an existing Drawing. An
// empty list replaces the entity wholesale, or on a chunked entity appends the next chunk.
func UpdateDrawingCommand(uuid []byte, drawing *drawv1.Drawing, paths ...string) (map[string]any, error) {
	if drawing == nil {
		return nil, ErrNilEntity
	}

	return Command(CommandUpdateEntity, &drawv1.UpdateEntityRequest{
		Uuid:          uuid,
		Entity:        &drawv1.UpdateEntityRequest_Drawing{Drawing: drawing},
		UpdatedFields: fieldMask(paths),
	})
}

// UpdateTransformCommand patches the listed draw.TransformPath* paths on an existing Transform.
// An empty list replaces the entity wholesale.
func UpdateTransformCommand(uuid []byte, transform *commonv1.Transform, paths ...string) (map[string]any, error) {
	if transform == nil {
		return nil, ErrNilEntity
	}

	return Command(CommandUpdateEntity, &drawv1.UpdateEntityRequest{
		Uuid:          uuid,
		Entity:        &drawv1.UpdateEntityRequest_Transform{Transform: transform},
		UpdatedFields: fieldMask(paths),
	})
}

// RemoveEntityCommand removes one entity by UUID.
func RemoveEntityCommand(uuid []byte) (map[string]any, error) {
	return Command(CommandRemoveEntity, &drawv1.RemoveEntityRequest{Uuid: uuid})
}

// RemoveAllCommand clears the scene. world_state_store has no bulk-removal signal, so a store
// fans this out into one removal event per entity.
func RemoveAllCommand() map[string]any {
	return map[string]any{CommandKey: CommandRemoveAll}
}

// GetEntityChunkCommand fetches a chunked entity's data from an element offset, in the flat
// shape the visualizer sends: uuid is the canonical 36-character string, not base64.
func GetEntityChunkCommand(uuid string, start uint32) map[string]any {
	return map[string]any{
		CommandKey: CommandGetEntityChunkFlat,
		"uuid":     uuid,
		"start":    float64(start),
	}
}

func fieldMask(paths []string) *fieldmaskpb.FieldMask {
	if len(paths) == 0 {
		return nil
	}

	return &fieldmaskpb.FieldMask{Paths: paths}
}
