package client

import (
	"encoding/json"
)

// RemoveAllSpatialObjects clears all drawn items from the visualizer.
//
// Parameters:
//   - names: A list of names of items to clear
//
// Deprecated: use [github.com/viam-labs/motion-tools/client/api.RemoveAll] instead.
// See the v1 → v2 migration guide:
// https://viamrobotics.github.io/visualization/migration/v1-to-v2/
func RemoveAllSpatialObjects() error {
	data := map[string]interface{}{}

	json, err := json.Marshal(data)
	if err != nil {
		return err
	}

	return postHTTP(json, "json", "remove-all")
}
