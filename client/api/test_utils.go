package api

import (
	"os"
	"strconv"
	"testing"

	"github.com/viamrobotics/visualization/client/server"
)

// defaultDrawServerPort matches the port `pnpm dev` and cmd/draw-server listen on.
const defaultDrawServerPort = 3030

// drawServerPort is the port these tests post to. Parallel e2e workers each run
// their own draw server, and DRAW_SERVER_PORT is how they say which one.
func drawServerPort(t *testing.T) int {
	raw := os.Getenv("DRAW_SERVER_PORT")
	if raw == "" {
		return defaultDrawServerPort
	}
	port, err := strconv.Atoi(raw)
	if err != nil {
		t.Fatalf("DRAW_SERVER_PORT=%q is not a number: %v", raw, err)
	}
	return port
}

// startTestServer starts the draw server the api tests post to and stops it on cleanup.
func startTestServer(t *testing.T) {
	_ = server.Start(server.DrawServerConfig{
		Port:       drawServerPort(t),
		StaticPort: 5173,
		Production: false,
	})
	t.Cleanup(stopTestServer)
}

func stopTestServer() {
	server.Stop()
}
