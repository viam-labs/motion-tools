package client

import (
	"encoding/json"
)

// RemoveSpatialObjects clears a list of drawn items.
//
// Deprecated: the client/client package is deprecated. Use [github.com/viam-labs/motion-tools/client/api] instead. RemoveSpatialObjects has no
// direct v2 equivalent (remove-by-name is unsupported). Use
// [github.com/viam-labs/motion-tools/client/api.RemoveTransforms] or
// [github.com/viam-labs/motion-tools/client/api.RemoveDrawings] to clear a category, or
// keep entity IDs stable and update them in place. See the v1 → v2 migration guide:
// https://viamrobotics.github.io/visualization/migration/v1-to-v2/
func RemoveSpatialObjects(names []string) error {
	json, err := json.Marshal(names)

	if err != nil {
		return err
	}

	return postHTTP(json, "json", "remove")
}
