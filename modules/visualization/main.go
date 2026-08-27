// Package main is the visualization module: a Viam service that serves the draw API over
// world_state_store.
//
// Drawings reach the visualizer through a machine rather than client/server's localhost port.
// See README.md.
package main

import (
	"context"

	"go.viam.com/rdk/logging"
	"go.viam.com/rdk/module"
	"go.viam.com/rdk/resource"
	"go.viam.com/rdk/services/worldstatestore"
)

// Model is the registry triple this module publishes.
var Model = resource.NewModel("viam-viz", "visualization", "world-state-store")

func init() {
	resource.RegisterService(
		worldstatestore.API,
		Model,
		resource.Registration[worldstatestore.Service, *Config]{Constructor: newStore},
	)
}

func main() {
	ctx := context.Background()
	logger := logging.NewDebugLogger("visualization")

	mod, err := module.NewModuleFromArgs(ctx)
	if err != nil {
		logger.Fatal(err)
	}
	if err := mod.AddModelFromRegistry(ctx, worldstatestore.API, Model); err != nil {
		logger.Fatal(err)
	}
	if err := mod.Start(ctx); err != nil {
		logger.Fatal(err)
	}
	defer mod.Close(ctx)

	<-ctx.Done()
}
