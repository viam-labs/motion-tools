package client

import (
	"go.viam.com/rdk/referenceframe"
)

// DrawWorldState will draw a world state in the visualizer.
//
// Deprecated: use [github.com/viam-labs/motion-tools/client/api.DrawWorldState] instead.
// See the v1 → v2 migration guide:
// https://viamrobotics.github.io/visualization/migration/v1-to-v2/
func DrawWorldState(ws *referenceframe.WorldState, fs *referenceframe.FrameSystem, inputs referenceframe.FrameSystemInputs) error {
	geoms, err := ws.ObstaclesInWorldFrame(fs, inputs)
	if err != nil {
		return err
	}

	geometries := geoms.Geometries()
	cc := &colorChooser{}
	colors := make([]string, len(geometries))
	for i := range geometries {
		colors[i] = cc.next()
	}

	if err = DrawGeometries(geoms, colors); err != nil {
		return err
	}

	return nil
}
