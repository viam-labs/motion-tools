package client

import (
	"github.com/viam-labs/motion-tools/draw"
	"go.viam.com/rdk/referenceframe"
	"go.viam.com/rdk/spatialmath"
)

// DrawFrameSystem will draw a frame system in the visualizer.
//
// Deprecated: use [github.com/viam-labs/motion-tools/client/api.DrawFrameSystem] instead.
// See the v1 → v2 migration guide:
// https://viamrobotics.github.io/visualization/migration/v1-to-v2/
func DrawFrameSystem(fs *referenceframe.FrameSystem, inputs referenceframe.FrameSystemInputs) error {

	colorMap := make(map[string]draw.Color)
	drawnFrameSystem := draw.NewDrawnFrameSystem(fs, inputs, draw.WithFrameSystemColors(colorMap))
	transforms, err := drawnFrameSystem.ToTransforms()
	if err != nil {
		return err
	}

	geometries := make([]spatialmath.Geometry, 0)
	colors := make([]string, 0)
	for _, transform := range transforms {
		geometry, err := referenceframe.NewGeometryFromProto(transform.GetPhysicalObject())
		if err != nil {
			return err
		}
		geometries = append(geometries, geometry)
		metadata, err := draw.StructToMetadata(transform.Metadata)
		if err != nil {
			return err
		}
		for _, color := range metadata.Colors {
			colors = append(colors, color.ToHex())
		}
	}

	geometriesInFrame := referenceframe.NewGeometriesInFrame("world", geometries)
	DrawGeometries(geometriesInFrame, colors)

	return nil
}
