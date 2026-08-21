package client

import (
	"context"

	"go.viam.com/rdk/referenceframe"
	"go.viam.com/rdk/robot"
	"go.viam.com/rdk/spatialmath"

	"github.com/viam-labs/motion-tools/mutils"
)

// DrawRobot will draw a robot in the visualizer.
//
// Parameters:
//   - ws: an optional world state, may be nil
//
// Deprecated: use [github.com/viam-labs/motion-tools/client/api.DrawRobot] instead.
// See the v1 → v2 migration guide:
// https://viamrobotics.github.io/visualization/migration/v1-to-v2/
func DrawRobot(ctx context.Context, myRobot robot.Robot, ws *referenceframe.WorldState) error {
	fsCfg, err := myRobot.FrameSystemConfig(ctx)
	if err != nil {
		return err
	}

	rf, err := referenceframe.NewFrameSystem("foo", fsCfg.Parts, nil)
	if err != nil {
		return err
	}

	inputs, err := mutils.GetInputs(ctx, rf, myRobot)
	if err != nil {
		return err
	}

	if ws != nil {
		err = DrawWorldState(ws, rf, inputs)
		if err != nil {
			return err
		}

		for _, lif := range ws.Transforms() {
			err = DrawGeometries(referenceframe.NewGeometriesInFrame(
				lif.Parent(),
				[]spatialmath.Geometry{lif.Geometry()},
			), DefaultColorMap)
			if err != nil {
				return err
			}
		}

	}

	gifs, err := referenceframe.FrameSystemGeometries(rf, inputs)
	if err != nil {
		return nil
	}
	for _, gif := range gifs {
		err = DrawGeometries(gif, DefaultColorMap)
		if err != nil {
			return nil
		}
	}

	return nil
}
