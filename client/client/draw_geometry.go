package client

import (
	"encoding/json"

	"github.com/viam-labs/motion-tools/client/colorutil"
	"github.com/viam-labs/motion-tools/draw"
	commonv1 "go.viam.com/api/common/v1"
	"google.golang.org/protobuf/encoding/protojson"

	"go.viam.com/rdk/spatialmath"
)

// DrawGeometry draws a geometry in the visualizer.
//
// Labels must be unique within a world. Calling DrawGeometry with labels that
// already exist will instead update the pose of that geometry. Only poses can be updated,
// geometries must be cleared if their shape is to change.
//
// Deprecated: use [github.com/viam-labs/motion-tools/client/api.DrawGeometry] instead.
// See the v1 → v2 migration guide:
// https://viamrobotics.github.io/visualization/migration/v1-to-v2/
func DrawGeometry(geometry spatialmath.Geometry, color string) error {

	rgbColor, err := colorutil.NamedColorToRGB(color)
	if err != nil {
		return err
	}
	drawing, err := draw.NewDrawnGeometry(geometry, draw.WithGeometryColor(draw.NewColor(draw.WithRGB(rgbColor[0], rgbColor[1], rgbColor[2]))))
	if err != nil {
		return err
	}

	transform, err := drawing.Draw("")
	if err != nil {
		return err
	}

	json, err := transformToGeometryJSON(transform)
	if err != nil {
		return err
	}

	return postHTTP(json, "json", "geometry")
}

func transformToGeometryJSON(transform *commonv1.Transform) ([]byte, error) {
	data, err := protojson.Marshal(transform.GetPhysicalObject())
	if err != nil {
		return nil, err
	}
	metadata, err := draw.StructToMetadata(transform.Metadata)
	if err != nil {
		return nil, err
	}
	return json.Marshal(map[string]interface{}{
		"geometry": json.RawMessage(data),
		"color":    metadata.Colors[0].ToHex(),
	})
}
