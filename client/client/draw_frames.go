package client

import (
	"encoding/json"

	"go.viam.com/rdk/referenceframe"
)

// DrawFrames draws Frames in the visualizer.
//
// Deprecated: use [github.com/viam-labs/motion-tools/client/api.DrawFrames] instead.
// See the v1 → v2 migration guide:
// https://viamrobotics.github.io/visualization/migration/v1-to-v2/
func DrawFrames(frames []referenceframe.Frame) error {
	result, err := json.Marshal(map[string]interface{}{
		"frames": frames,
	})

	if err != nil {
		return err
	}

	return postHTTP(result, "json", "frames")
}
