package api

import (
	"testing"

	"github.com/viamrobotics/visualization/client/server"
)

// startTestServer starts the draw server the api tests post to and stops it on cleanup.
func startTestServer(t *testing.T) {
	_ = server.Start(server.DrawServerConfig{
		Port:       3030,
		StaticPort: 5173,
		Production: false,
	})
	t.Cleanup(stopTestServer)
}

func stopTestServer() {
	server.Stop()
}
