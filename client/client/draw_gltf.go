package client

import (
	"fmt"
	"net/http"
	"os"
)

// DrawGLTF will draw a glTF file in the visualizer.
//
// Deprecated: use [github.com/viam-labs/motion-tools/client/api.DrawGLTF] instead.
// See the v1 → v2 migration guide:
// https://viamrobotics.github.io/visualization/migration/v1-to-v2/
func DrawGLTF(filePath string) error {
	file, err := os.Open(filePath)
	if err != nil {
		return err
	}

	defer file.Close()

	fileInfo, err := file.Stat()
	if err != nil {
		return err
	}

	req, err := http.NewRequest("POST", url+"gltf", file)
	if err != nil {
		return err
	}

	req.Header.Set("Content-Type", "model/gltf-binary")
	req.ContentLength = fileInfo.Size()

	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		return err
	}

	defer resp.Body.Close()

	if resp.StatusCode != 200 {
		return fmt.Errorf("HTTP post unsuccessful: %s", resp.Status)
	}

	return nil
}
