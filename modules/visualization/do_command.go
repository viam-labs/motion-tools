package main

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"

	"connectrpc.com/connect"
	"github.com/google/uuid"
	drawv1 "github.com/viam-labs/motion-tools/draw/v1"
	"github.com/viam-labs/motion-tools/worldstate"
	"google.golang.org/protobuf/encoding/protojson"
	"google.golang.org/protobuf/proto"
)

// ErrMissingCommand is returned when a DoCommand payload names no command.
var ErrMissingCommand = errors.New(`DoCommand requires a "command" string`)

// Proto field names make a hand-written request read like the .proto file, and numeric enums
// keep the metadata Struct contract identical on both halves of the wire.
var (
	tunnelMarshal   = protojson.MarshalOptions{UseProtoNames: true, UseEnumNumbers: true}
	tunnelUnmarshal = protojson.UnmarshalOptions{DiscardUnknown: true}
)

type commandHandler func(context.Context, any) (map[string]any, error)

// DoCommand is the module's write door and its chunked-read door.
//
// A write names a draw.v1.DrawService method and carries its request as protojson, so draw.v1
// stays the single definition of the vocabulary — a new RPC or drawing type needs no change here:
//
//	{"command": "AddEntity", "request": {"drawing": {"reference_frame": "my-line", ...}}}
//
// Streaming methods are not tunnelled; StreamTransformChanges replaces them. Chunked reads keep
// the flat shape the visualizer already sends:
//
//	{"command": "get_entity_chunk", "uuid": "<36-char uuid>", "start": <element offset>}
func (s *Store) DoCommand(ctx context.Context, cmd map[string]any) (map[string]any, error) {
	name, ok := cmd[worldstate.CommandKey].(string)
	if !ok || name == "" {
		return nil, ErrMissingCommand
	}

	if name == worldstate.CommandGetEntityChunkFlat {
		return s.getEntityChunk(ctx, cmd)
	}

	handler, ok := s.commands[name]
	if !ok {
		return nil, fmt.Errorf("unknown command %q", name)
	}

	return handler(ctx, cmd[worldstate.RequestKey])
}

func (s *Store) newCommands() map[string]commandHandler {
	return map[string]commandHandler{
		worldstate.CommandAddEntity:           tunnel(s.svc.AddEntity),
		worldstate.CommandAddEntities:         tunnel(s.svc.AddEntities),
		worldstate.CommandUpdateEntity:        tunnel(s.svc.UpdateEntity),
		worldstate.CommandRemoveEntity:        tunnel(s.svc.RemoveEntity),
		worldstate.CommandRemoveAll:           tunnel(s.svc.RemoveAll),
		worldstate.CommandRemoveAllDrawings:   tunnel(s.svc.RemoveAllDrawings),
		worldstate.CommandRemoveAllTransforms: tunnel(s.svc.RemoveAllTransforms),
		worldstate.CommandCreateRelationship:  tunnel(s.svc.CreateRelationship),
		worldstate.CommandDeleteRelationship:  tunnel(s.svc.DeleteRelationship),
		worldstate.CommandSetScene:            tunnel(s.svc.SetScene),
		worldstate.CommandGetEntityChunk:      tunnel(s.svc.GetEntityChunk),
	}
}

// protoPtr constrains a pointer type whose element is T and which is a proto message.
type protoPtr[T any] interface {
	*T
	proto.Message
}

// unaryRPC is the shape every non-streaming DrawService method shares.
type unaryRPC[Req, Res any] func(context.Context, *connect.Request[Req]) (*connect.Response[Res], error)

// tunnel adapts a unary DrawService method into a DoCommand handler, decoding its request and
// encoding its response as protojson.
func tunnel[Req, Res any, ReqPtr protoPtr[Req], ResPtr protoPtr[Res]](
	call unaryRPC[Req, Res],
) commandHandler {
	return func(ctx context.Context, payload any) (map[string]any, error) {
		var request Req
		if err := decodeRequest(payload, ReqPtr(&request)); err != nil {
			return nil, err
		}

		response, err := call(ctx, connect.NewRequest(&request))
		if err != nil {
			return nil, err
		}

		return encodeMessage(ResPtr(response.Msg))
	}
}

// getEntityChunk serves the flat request shape, so the visualizer's existing chunk loader works
// against this module unchanged.
func (s *Store) getEntityChunk(ctx context.Context, cmd map[string]any) (map[string]any, error) {
	id, ok := cmd["uuid"].(string)
	if !ok || id == "" {
		return nil, fmt.Errorf("%s requires a uuid", worldstate.CommandGetEntityChunkFlat)
	}

	parsed, err := uuid.Parse(id)
	if err != nil {
		return nil, fmt.Errorf("parsing uuid %q: %w", id, err)
	}

	start, _ := cmd["start"].(float64)

	response, err := s.svc.GetEntityChunk(ctx, connect.NewRequest(&drawv1.GetEntityChunkRequest{
		Uuid:  parsed[:],
		Start: uint32(start),
	}))
	if err != nil {
		return nil, err
	}

	chunk := map[string]any{
		"start": float64(response.Msg.GetStart()),
		"done":  response.Msg.GetDone(),
	}

	if entity := chunkEntity(response.Msg); entity != nil {
		encoded, err := encodeMessage(entity)
		if err != nil {
			return nil, err
		}
		chunk["entity"] = encoded
	}

	return chunk, nil
}

func chunkEntity(response *drawv1.GetEntityChunkResponse) proto.Message {
	switch entity := response.GetEntity().(type) {
	case *drawv1.GetEntityChunkResponse_Drawing:
		return entity.Drawing
	case *drawv1.GetEntityChunkResponse_Transform:
		return entity.Transform
	default:
		return nil
	}
}

// decodeRequest fills msg from a DoCommand payload. A nil payload leaves msg zero, which is what
// the several no-argument requests want.
func decodeRequest(payload any, msg proto.Message) error {
	if payload == nil {
		return nil
	}

	fields, ok := payload.(map[string]any)
	if !ok {
		return fmt.Errorf("%q must be an object", worldstate.RequestKey)
	}

	encoded, err := json.Marshal(fields)
	if err != nil {
		return fmt.Errorf("re-encoding request: %w", err)
	}

	if err := tunnelUnmarshal.Unmarshal(encoded, msg); err != nil {
		return fmt.Errorf("decoding %s: %w", msg.ProtoReflect().Descriptor().FullName(), err)
	}

	return nil
}

func encodeMessage(msg proto.Message) (map[string]any, error) {
	encoded, err := tunnelMarshal.Marshal(msg)
	if err != nil {
		return nil, fmt.Errorf("encoding %s: %w", msg.ProtoReflect().Descriptor().FullName(), err)
	}

	decoded := map[string]any{}
	if err := json.Unmarshal(encoded, &decoded); err != nil {
		return nil, fmt.Errorf("re-encoding response: %w", err)
	}

	return decoded, nil
}
