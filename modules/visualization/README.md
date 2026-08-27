# Visualization module

A Viam service that serves the draw API over the [`world_state_store`](https://docs.viam.com/reference/apis/services/world-state-store/) API.

The draw API's other server, `client/server`, listens on `localhost:3030` with no credentials, which confines drawings to local sessions and custom applications. This module is a peer of that server: the same draw service, reached through a machine instead of a port. Configure it, write to it from any Viam SDK, and the visualizer renders the result.

## Model

`viam-viz:visualization:world-state-store`, implementing `rdk:service:world_state_store`.

### Configuration

```json
{
	"temp_dir": "/tmp/viam-visualization"
}
```

| Attribute  | Type   | Required | Description                                                                                                                                                                                                |
| ---------- | ------ | -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `temp_dir` | string | no       | Where chunked entity payloads are buffered. Defaults to `viam-visualization` under the system temp dir. Stale files there are deleted at startup, so do not point it at a directory holding anything else. |

## Writing

From Go, build with the `draw` package's shape builders and serialize with the `worldstate` package. Don't hand-write the payload:

```go
import (
    "github.com/viam-labs/motion-tools/draw"
    "github.com/viam-labs/motion-tools/worldstate"
)

store, err := worldstatestore.FromProvider(machine, "world-state-store")

line, err := draw.NewLine(
    []r3.Vector{{X: -250}, {Z: 200}, {X: 250}},
    draw.WithLineWidth(12),
    draw.WithSingleLineColor(draw.NewColor(draw.WithRGB(0, 120, 255))),
)

// WithID derives a stable UUID from the name, so drawing "my-line" again updates it in place.
drawing := line.Draw("my-line",
    draw.WithID("my-line"),
    draw.WithPose(spatialmath.NewPoseFromPoint(r3.Vector{Z: 500})),
)

cmd, err := worldstate.AddDrawingCommand(drawing.ToProto())
_, err = store.DoCommand(ctx, cmd)
```

`worldstate.AddTransformCommand` does the same for a `*commonv1.Transform` from `draw.NewTransform` or `DrawnGeometry.Draw`. `worldstate.UpdateDrawingCommand` and `worldstate.UpdateTransformCommand` take a UUID and the `draw.DrawingPath*` / `draw.TransformPath*` field-mask constants; `worldstate.RemoveEntityCommand`, `worldstate.RemoveAllCommand` and `worldstate.GetEntityChunkCommand` round out the set. For anything without a helper, `worldstate.Command(method, request)` encodes an arbitrary `draw.v1.DrawService` request.

### The wire form

Underneath, a command names a `draw.v1.DrawService` method and carries its request as protojson, so the proto is the schema and a new RPC or drawing type needs no change to this module. The helpers above produce this object; any SDK's `DoCommand` can send it built by hand:

```jsonc
{
	"command": "AddEntity",
	"request": {
		"drawing": {
			"reference_frame": "my-line",
			"pose_in_observer_frame": {
				"reference_frame": "world",
				"pose": { "x": 0, "y": 0, "z": 500, "oz": 1 },
			},
			"physical_object": {
				"line": { "positions": "<base64 float32 xyz>", "line_width": 12 },
			},
			"metadata": { "colors": "<base64 rgb>", "color_format": 1 },
		},
	},
}
```

From TypeScript, that goes through the same client the visualizer uses:

```ts
import { WorldStateStoreClient } from '@viamrobotics/sdk'

const store = new WorldStateStoreClient(machine, 'world-state-store')
await store.doCommand(command)
```

Supported commands: `AddEntity`, `AddEntities`, `UpdateEntity`, `RemoveEntity`, `RemoveAll`, `RemoveAllDrawings`, `RemoveAllTransforms`, `CreateRelationship`, `DeleteRelationship`, `GetEntityChunk`, `SetScene`.

Bytes fields (`positions`, `poses`, `control_points`, `colors`, `opacities`, `uuid`) are base64 strings, as protojson requires. Enums are accepted as numbers or names.

Streaming methods are not tunnelled — `StreamTransformChanges` replaces them.

### Chunked entities

A point set too large for one message is sent as an `AddEntity` carrying the first chunk and declaring `metadata.chunks`, then one `UpdateEntity` per remaining chunk. An **unmasked** `UpdateEntity` on a chunked entity appends to its buffer; a masked one patches a field. The visualizer pulls whatever it has not received with `get_entity_chunk`.

```go
seed := chunkOf(0).ToProto()
seed.Metadata.Chunks = &drawv1.Chunks{ChunkSize: 200, Total: 2000, Stride: 12}
cmd, err := worldstate.AddDrawingCommand(seed)

// then, once per remaining chunk — no field mask means "append"
cmd, err = worldstate.UpdateDrawingCommand(uuid, chunkOf(start).ToProto())
```

```jsonc
// first: declares the total, carries chunk 0
{"command": "AddEntity", "request": {"drawing": {
  "reference_frame": "cloud",
  "physical_object": {"points": {"positions": "<base64 chunk 0>"}},
  "metadata": {"chunks": {"chunk_size": 200, "total": 2000, "stride": 12}}
}}}

// then, once per remaining chunk — no updated_fields
{"command": "UpdateEntity", "request": {"uuid": "<base64 uuid>", "drawing": {
  "reference_frame": "cloud",
  "physical_object": {"points": {"positions": "<base64 chunk n>"}}
}}}
```

An append is still validated as an update, so it must repeat `reference_frame`; omitting it is rejected as an attempt to rename the entity. `stride` is bytes per element (12 for float32 xyz) and `total` is element count.

## Reading

`ListUUIDs`, `GetTransform` and `StreamTransformChanges` work as the API specifies. Chunked entities are pulled with the command the visualizer already sends:

```json
{ "command": "get_entity_chunk", "uuid": "<36-char uuid>", "start": 0 }
```

### How drawings travel

`viam.common.v1.Transform.physical_object` is a closed `Geometry` oneof — sphere, box, capsule, mesh, pointcloud — with no case for a line, arrow, points set, NURBS curve or model. So a `Drawing` is projected onto a `Transform`: its reference frame, pose and UUID ride natively, and its `Shape` is encoded as protojson into the metadata `Struct` under a `shape` key, declared by `draw.v1.DrawingProjection`.

A transform with no `shape` key is a real transform and renders unchanged. The visualizer's `useWorldState` hook decodes the key with the generated `DrawingProjection` and hands the result to the same renderers the local draw service uses, so there is one definition of drawing data and one parser for it.

## Limits

- **Bulk clears fan out.** `RemoveAll` is one event inside the draw service but one `REMOVED` per entity over `world_state_store`, which has no bulk signal.
- **No scene or camera channel.** `SetScene` is accepted, but `world_state_store` has no push channel for scene metadata, so camera moves do not reach the visualizer.
- **Chunking covers `points` only.** Other shapes must fit in a single message.
- **32 MiB per message.** That is `rpc.MaxMessageSize`, and protojson base64 inflates binary payloads by about a third — roughly 20 bytes per coloured point. Use `chunks` for large point sets, and prefer `ModelAsset.url` over inline `data`.

## Development

```
./build.sh          # builds bin/visualization
go test ./... -count=1
```

Register it as a local module while developing:

```json
{
	"modules": [
		{
			"type": "local",
			"name": "visualization",
			"executable_path": "/absolute/path/to/modules/visualization/bin/visualization"
		}
	],
	"services": [
		{
			"name": "world-state-store",
			"api": "rdk:service:world_state_store",
			"model": "viam-viz:visualization:world-state-store",
			"attributes": {}
		}
	]
}
```
