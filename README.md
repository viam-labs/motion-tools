# Viam Visualization

3D visualization interface for spatial data using Viam's APIs — frame systems, geometries, point clouds, drawings — for motion-related monitoring, testing, and debugging.

## Documentation

📚 **[viamrobotics.github.io/visualization](https://viamrobotics.github.io/visualization/)** is our guide to a few popular use cases. It covers:

- [Running locally](https://viamrobotics.github.io/visualization/guides/local-usage/) — set up the app and drive it from Go via `client/api`.
- [Embedding `<Visualizer />`](https://viamrobotics.github.io/visualization/guides/embedding/) — drop the visualizer into your own Svelte app.
- [Implementing WorldStateStoreService](https://viamrobotics.github.io/visualization/guides/worldstatestore/) — produce `Transform`s for a Viam WorldStateStoreService module with `draw`.
- A live [playground](https://viamrobotics.github.io/visualization/playground/snapshot) rendering a snapshot.

## Quick start

```bash
make setup     # one-time: install Node 22, pnpm, bun, Go, buf, project deps
make up        # http://localhost:5173
```

For manual setup, machine configs, multiple instances, and troubleshooting see the [local-usage guide](https://viamrobotics.github.io/visualization/guides/local-usage/).

## Backend plan testing (manual)

When testing plan playback backend changes, you can load and step plans directly through the draw server HTTP endpoints.

1. Start the app and draw server:

```bash
make up
```

2. POST a plan request JSON file to render the first step:

```bash
curl -X POST \
	http://localhost:3030/plan-request \
	-H 'Content-Type: application/json' \
	--data-binary @/absolute/path/to/plan-request.json
```

3. Step forward/backward:

```bash
curl -X POST http://localhost:3030/plan-request/step \
	-H 'Content-Type: application/json' \
	-d '{"direction":"next"}'

curl -X POST http://localhost:3030/plan-request/step \
	-H 'Content-Type: application/json' \
	-d '{"direction":"prev"}'
```

4. Jump to a specific step index:

```bash
curl -X POST http://localhost:3030/plan-request/step \
	-H 'Content-Type: application/json' \
	-d '{"step":10}'
```

Notes:

- The loader supports files containing concatenated JSON objects (for example plan request + result in one file).
- If no trajectory is available yet, stepping returns a conflict response.

## Contributing

Run the dev server with HMR:

```bash
pnpm dev
```

See [CLAUDE.md](CLAUDE.md) for contributor conventions.

## Programmatic camera control

The visualizer exposes a `cameraControls` object on `window`. Open the browser console and call methods on it to move the camera or tweak its settings at runtime. Full API: <https://github.com/yomotsu/camera-controls#properties>.
